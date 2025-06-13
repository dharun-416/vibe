import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { createLogger } from "@vibe/shared-types";

const logger = createLogger("ToolManager");
import type { IToolManager } from "../interfaces/index.js";
import type { ReactObservation } from "../react/types.js";
import type { MCPGenerateTextResult, MCPToolResult } from "@vibe/shared-types";
import type { IMCPConnectionService } from "../services/mcp-service.js";
import type { CoreMessage } from "ai";

// Constants
const LOG_PREFIX = "[AgentCore]";

export class ToolManager implements IToolManager {
  private conversationHistory: CoreMessage[] = [];
  private cachedTools: any = null;
  private cachedFormattedTools: string | null = null;

  constructor(private mcpService?: IMCPConnectionService) {}

  async getTools(): Promise<any> {
    // Return cached tools if available
    if (this.cachedTools) {
      return this.cachedTools;
    }

    if (!this.mcpService) {
      return undefined;
    }

    try {
      this.cachedTools = await this.mcpService.getTools();
      logger.debug(
        `${LOG_PREFIX} Tools cached (${Object.keys(this.cachedTools || {}).length} tools)`,
      );
      return this.cachedTools;
    } catch (error) {
      logger.error(`${LOG_PREFIX} Failed to get MCP tools:`, error);
      return undefined;
    }
  }

  async executeTools(
    toolName: string,
    args: any,
    toolCallId: string,
  ): Promise<ReactObservation> {
    try {
      logger.debug(
        `${LOG_PREFIX} Executing tool: ${toolName} with args:`,
        args,
      );

      const tools = await this.getTools();
      if (!tools) {
        return {
          tool_call_id: toolCallId,
          tool_name: toolName,
          result: null,
          error: "MCP tools not available",
        };
      }

      // Use the AI SDK to execute the tool with optimized settings
      const result = await generateText({
        model: openai("gpt-4o-mini"),
        tools,
        messages: [
          {
            role: "user",
            content: `Execute ${toolName} with arguments: ${JSON.stringify(args)}`,
          },
        ],
        toolChoice: { type: "tool", toolName },
        maxSteps: 1, // Single step execution - no reasoning needed for tool calls
      });

      const toolResults = this.extractRawToolResults(result);

      return {
        tool_call_id: toolCallId,
        tool_name: toolName,
        result: toolResults || result.text,
      };
    } catch (error) {
      logger.error(
        `${LOG_PREFIX} Tool execution failed for ${toolName}:`,
        error,
      );
      return {
        tool_call_id: toolCallId,
        tool_name: toolName,
        result: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async formatToolsForReact(): Promise<string> {
    // Return cached formatted tools if available
    if (this.cachedFormattedTools) {
      return this.cachedFormattedTools;
    }

    try {
      const tools = await this.getTools();
      if (!tools) {
        return "No tools available";
      }

      logger.debug(
        `${LOG_PREFIX} Formatting ${Object.keys(tools).length} MCP tools for ReAct`,
      );

      // Convert tools to ReAct format
      const toolDescriptions = Object.entries(tools)
        .map(([name, tool]: [string, any]) => {
          const description = tool.description || "No description";
          const parameters = tool.inputSchema
            ? JSON.stringify(tool.inputSchema, null, 2)
            : "{}";

          logger.debug(`${LOG_PREFIX} Tool ${name} formatted`);

          return `<tool>
<name>${name}</name>
<description>${description}</description>
<parameters_json_schema>${parameters}</parameters_json_schema>
</tool>`;
        })
        .join("\n\n");

      this.cachedFormattedTools = toolDescriptions;
      logger.debug(
        `${LOG_PREFIX} Tools formatted and cached for LLM (${Object.keys(tools).length} total)`,
      );
      return this.cachedFormattedTools;
    } catch (error) {
      logger.error(`${LOG_PREFIX} Failed to format tools for ReAct:`, error);
      return "No tools available";
    }
  }

  // Direct tool calling without LLM - more efficient for deterministic operations
  async saveTabMemory(
    url: string,
    title: string,
    content: string,
  ): Promise<void> {
    if (!this.mcpService) {
      logger.warn(
        `${LOG_PREFIX} No MCP service available for saving tab memory`,
      );
      return;
    }

    try {
      // Check if save_tab_memory tool is available
      const tools = await this.getTools();
      if (!tools || !tools.save_tab_memory) {
        logger.warn(`${LOG_PREFIX} save_tab_memory tool not available`);
        return;
      }

      // Call the tool directly through MCP service - no LLM needed
      const args = { url, title, content };
      await this.mcpService.callTool("save_tab_memory", args);
      logger.debug(`${LOG_PREFIX} Saved tab memory for: ${title}`);
    } catch (error) {
      logger.error(`${LOG_PREFIX} Failed to save tab memory:`, error);
    }
  }

  async saveConversationMemory(
    userMessage: string,
    response: string,
  ): Promise<void> {
    try {
      // Add to local conversation history for current session context
      this.conversationHistory.push(
        { role: "user", content: userMessage },
        { role: "assistant", content: response },
      );

      // Keep only last 10 exchanges (20 messages) to prevent unbounded growth
      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-20);
      }

      // PERSISTENT MEMORY: Save only user information to MCP server
      if (this.mcpService) {
        const tools = await this.getTools();
        if (tools && tools.save_conversation_memory) {
          // Only save meaningful user information - not system responses
          if (this.shouldSaveToMemory(userMessage)) {
            try {
              // Save only the user message (first 300 chars to keep it concise)
              const trimmedUserMessage =
                userMessage.length > 300
                  ? userMessage.substring(0, 300) + "..."
                  : userMessage;

              await this.mcpService.callTool("save_conversation_memory", {
                information: trimmedUserMessage,
              });
              logger.debug(
                `${LOG_PREFIX} Saved user info to persistent memory: ${trimmedUserMessage.substring(0, 50)}...`,
              );
            } catch (error) {
              logger.error(
                `${LOG_PREFIX} Failed to save to MCP memory:`,
                error,
              );
            }
          }
        }
      }

      logger.debug(
        `${LOG_PREFIX} Saved conversation memory (local + selective persistent)`,
      );
    } catch (error) {
      logger.error(`${LOG_PREFIX} Failed to save conversation memory:`, error);
    }
  }

  // Determine if user message contains information worth saving to persistent memory
  private shouldSaveToMemory(userMessage: string): boolean {
    const messageLower = userMessage.toLowerCase();

    // DON'T save these types of messages
    const skipPatterns = [
      "what is",
      "what was",
      "what did",
      "who is",
      "who was",
      "how do",
      "how can",
      "can you",
      "could you",
      "tell me about",
      "explain",
      "describe",
      "summarize",
      "summary",
      "find",
      "search",
      "show me",
      "get me",
      "retrieve",
      "hello",
      "hi ",
      "hey",
      "thanks",
      "thank you",
    ];

    // Skip if it's just a question or request
    if (skipPatterns.some(pattern => messageLower.includes(pattern))) {
      return false;
    }

    // Skip very short messages (likely questions/greetings)
    if (userMessage.trim().length < 10) {
      return false;
    }

    // SAVE these types of messages (personal information)
    const savePatterns = [
      "my name is",
      "i am",
      "i'm called",
      "call me",
      "i work at",
      "i work for",
      "my job",
      "my company",
      "i like",
      "i prefer",
      "i love",
      "i hate",
      "i dislike",
      "i live in",
      "i'm from",
      "my location",
      "my email",
      "my phone",
      "i was born",
      "my birthday",
      "my age",
      "my hobby",
      "my interest",
      "i enjoy",
      "i need",
      "i want",
      "my goal",
      "my project",
    ];

    return savePatterns.some(pattern => messageLower.includes(pattern));
  }

  async getConversationHistory(): Promise<CoreMessage[]> {
    return [...this.conversationHistory];
  }

  private extractRawToolResults(result: MCPGenerateTextResult): string | null {
    try {
      if (!result.toolResults || !Array.isArray(result.toolResults)) {
        return null;
      }

      const toolResults = result.toolResults
        .map((toolResult: MCPToolResult) => {
          if (!toolResult.result) return null;

          // Handle AI SDK MCP format: result.content[0].text contains the JSON
          if (
            typeof toolResult.result === "object" &&
            toolResult.result.content &&
            Array.isArray(toolResult.result.content) &&
            toolResult.result.content[0]?.text
          ) {
            return toolResult.result.content[0].text;
          }

          // Handle string results (legacy format)
          if (typeof toolResult.result === "string") {
            return toolResult.result;
          }

          // Fallback: stringify object
          return JSON.stringify(toolResult.result);
        })
        .filter(Boolean);

      return toolResults.length > 0 ? toolResults.join("\n\n") : null;
    } catch (error) {
      logger.error(`${LOG_PREFIX} Failed to extract raw tool results:`, error);
      return null;
    }
  }

  // Clear cache if needed (e.g., when MCP server restarts)
  clearToolCache(): void {
    this.cachedTools = null;
    this.cachedFormattedTools = null;
    logger.debug(`${LOG_PREFIX} Tool cache cleared`);
  }
}
