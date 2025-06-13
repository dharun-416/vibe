/**
 * MCP Connection Service
 *
 * Handles all MCP (Model Context Protocol) connection management,
 * including connection initialization, retry logic, and tool retrieval.
 */

import { experimental_createMCPClient } from "ai";
import { createLogger } from "@vibe/shared-types";

const logger = createLogger("McpService");

// Error Types
export class MCPConnectionError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = "MCPConnectionError";
  }
}

export class MCPToolsError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = "MCPToolsError";
  }
}

// Configuration Interface
export interface MCPConnectionConfig {
  serverUrl: string;
  maxAttempts?: number;
  retryDelay?: number;
  logPrefix?: string;
}

// Service Interface
export interface IMCPConnectionService {
  isConnected(): boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getTools(): Promise<any>;
  ensureConnection(): Promise<boolean>;
  callTool(toolName: string, args: any): Promise<any>;
}

/**
 * MCP Connection Service Implementation
 *
 * Manages connection lifecycle, retry logic, and tool access for MCP servers.
 */
export class MCPConnectionService implements IMCPConnectionService {
  private mcpClient?: Awaited<ReturnType<typeof experimental_createMCPClient>>;
  private isInitialized = false;
  private readonly maxAttempts: number;
  private readonly retryDelay: number;
  private readonly logPrefix: string;

  constructor(private readonly config: MCPConnectionConfig) {
    this.maxAttempts = config.maxAttempts ?? 3;
    this.retryDelay = config.retryDelay ?? 1000;
    this.logPrefix = config.logPrefix ?? "[MCPConnection]";
  }

  /**
   * Check if MCP client is connected and initialized
   */
  isConnected(): boolean {
    return this.isInitialized && this.mcpClient !== undefined;
  }

  /**
   * Initialize MCP client connection
   */
  async connect(): Promise<void> {
    try {
      logger.debug(
        `${this.logPrefix} Connecting to MCP server at ${this.config.serverUrl}`,
      );

      this.mcpClient = await experimental_createMCPClient({
        transport: {
          type: "sse",
          url: this.config.serverUrl,
        },
      });

      this.isInitialized = true;
      logger.debug(
        `${this.logPrefix} Successfully connected to MCP server at ${this.config.serverUrl}`,
      );
    } catch (error) {
      this.isInitialized = false;
      this.mcpClient = undefined;
      const errorMessage = `Failed to connect to MCP server at ${this.config.serverUrl}`;
      logger.error(`${this.logPrefix} ${errorMessage}:`, error);
      throw new MCPConnectionError(
        errorMessage,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Disconnect from MCP server
   */
  async disconnect(): Promise<void> {
    try {
      if (this.mcpClient && this.isInitialized) {
        await this.mcpClient.close();
        logger.debug(`${this.logPrefix} Disconnected from MCP server`);
      }
    } catch (error) {
      logger.error(`${this.logPrefix} Error during disconnect:`, error);
    } finally {
      this.mcpClient = undefined;
      this.isInitialized = false;
    }
  }

  /**
   * Ensure connection is ready, attempting to connect if needed
   */
  async ensureConnection(): Promise<boolean> {
    // If already connected, we're good
    if (this.isConnected()) {
      return true;
    }

    // Try to connect
    try {
      await this.connect();
      return true;
    } catch (error) {
      logger.error(`${this.logPrefix} Failed to ensure connection:`, error);
      return false;
    }
  }

  /**
   * Get tools from MCP server with retry logic
   */
  async getTools(): Promise<any> {
    if (!(await this.ensureConnection())) {
      throw new MCPConnectionError("Unable to establish MCP connection");
    }

    if (!this.mcpClient) {
      throw new MCPConnectionError("MCP client not available");
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
      try {
        const tools = await this.mcpClient.tools();
        if (tools) {
          logger.debug(
            `${this.logPrefix} Successfully retrieved tools (attempt ${attempt + 1})`,
          );
          return tools;
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn(
          `${this.logPrefix} Tools retrieval attempt ${attempt + 1} failed:`,
          error,
        );
      }

      // Wait before retrying (except on last attempt)
      if (attempt < this.maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }

    const errorMessage = `Failed to retrieve tools after ${this.maxAttempts} attempts`;
    logger.error(`${this.logPrefix} ${errorMessage}`);
    throw new MCPToolsError(errorMessage, lastError);
  }

  /**
   * Call a tool directly on the MCP server using the proper MCP protocol
   */
  async callTool(toolName: string, args: any): Promise<any> {
    if (!(await this.ensureConnection())) {
      throw new MCPConnectionError("Unable to establish MCP connection");
    }

    if (!this.mcpClient) {
      throw new MCPConnectionError("MCP client not available");
    }

    try {
      // Get the tools from the MCP client
      const tools = await this.mcpClient.tools();

      if (!tools || !tools[toolName]) {
        throw new Error(`Tool '${toolName}' not found in available tools`);
      }

      const tool = tools[toolName];

      if (!tool.execute) {
        throw new Error(`Tool '${toolName}' does not have an execute function`);
      }

      // Call the tool using its execute function with proper context
      const result = await tool.execute(args, {
        toolCallId: Math.random().toString(36).substring(7),
        messages: [], // Empty messages array for direct tool calls
        abortSignal: undefined,
      });

      logger.debug(
        `${this.logPrefix} Successfully called tool '${toolName}' directly`,
      );
      return result;
    } catch (error) {
      const errorMessage = `Failed to call tool '${toolName}' directly`;
      logger.error(`${this.logPrefix} ${errorMessage}:`, error);
      throw new Error(
        errorMessage +
          ": " +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }
}
