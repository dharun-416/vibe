import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message as AiSDKMessage } from "@ai-sdk/react";
import { ReasoningDisplay } from "../components/ui/reasoning-display";
import { BrowserProgressDisplay } from "../components/ui/browser-progress-display";
import { ToolCallDisplay } from "../components/ui/tool-call-display";
import { markdownComponents } from "../components/ui/markdown-components";
import type { GroupedMessage } from "../components/chat/Messages";

export const createMessageContentRenderer = (
  groupedMessages: GroupedMessage[],
  isAiGenerating: boolean,
) => {
  return (
    msg: AiSDKMessage,
    isLatest: boolean = false,
    allMessages?: AiSDKMessage[],
  ): React.ReactNode => {
    if (
      msg.id.startsWith("agent-progress-") &&
      msg.parts &&
      msg.parts.length === 2 &&
      (msg.parts[0].type as string) === "agent-progress-icon" &&
      msg.parts[1].type === "text"
    ) {
      const msgIndex = allMessages?.findIndex(m => m.id === msg.id) ?? -1;
      const previousMessages = allMessages?.slice(0, msgIndex) ?? [];
      const hasPreviousBrowserProgress = previousMessages.some(m =>
        m.id.startsWith("agent-progress-"),
      );

      if (hasPreviousBrowserProgress) {
        return null;
      }

      const remainingMessages = allMessages?.slice(msgIndex) ?? [];
      const browserProgressMessages = remainingMessages.filter(m =>
        m.id.startsWith("agent-progress-"),
      );

      const allProgressText = browserProgressMessages
        .map(m => {
          const textPart = m.parts?.find(p => p.type === "text");
          return (textPart as { text?: string })?.text || "";
        })
        .filter(Boolean)
        .join("\n");

      const isLatestGroup =
        allMessages ===
        groupedMessages[groupedMessages.length - 1]?.assistantMessages;

      return (
        <BrowserProgressDisplay
          progressText={allProgressText}
          isLive={isLatestGroup && isAiGenerating}
        />
      );
    }

    if (
      msg.parts &&
      msg.parts.some(p => (p.type as string) === "tool-invocation")
    ) {
      const toolPart = msg.parts.find(
        p => (p.type as string) === "tool-invocation",
      ) as any;
      const isLatestGroup =
        allMessages ===
        groupedMessages[groupedMessages.length - 1]?.assistantMessages;

      return (
        <ToolCallDisplay
          toolName={toolPart?.tool_name || "Unknown Tool"}
          toolArgs={toolPart?.args}
          isLive={isLatest && isLatestGroup && isAiGenerating}
        />
      );
    }

    const reasoningParts =
      msg.parts?.filter(p => (p.type as string) === "reasoning") || [];
    const toolParts =
      msg.parts?.filter(p => (p.type as string) === "tool-invocation") || [];
    const contentParts =
      msg.parts?.filter(
        p =>
          (p.type as string) !== "reasoning" &&
          (p.type as string) !== "tool-invocation",
      ) || [];

    const reasoningText = reasoningParts
      .map(p => (p as { text?: string }).text || "")
      .join("\n")
      .trim();

    const hasReasoning = reasoningText.length > 0;
    const hasToolCalls = toolParts.length > 0;
    const hasContent =
      contentParts.length > 0 ||
      (typeof msg.content === "string" && msg.content.trim().length > 0);

    const isLatestGroup =
      allMessages ===
      groupedMessages[groupedMessages.length - 1]?.assistantMessages;

    return (
      <>
        {hasReasoning && (
          <ReasoningDisplay
            reasoning={reasoningText}
            isLive={isLatest && isLatestGroup && isAiGenerating && hasReasoning}
          />
        )}
        {hasToolCalls &&
          toolParts.map((toolPart, index) => {
            const tool = toolPart as any;
            return (
              <ToolCallDisplay
                key={index}
                toolName={tool.tool_name || "Unknown Tool"}
                toolArgs={tool.args}
                isLive={isLatest && isLatestGroup && isAiGenerating}
              />
            );
          })}
        {hasContent && (
          <div className="message-text-content">
            {contentParts.length > 0 ? (
              contentParts.map((part, index) => {
                const textContent = (part as { text?: string }).text || "";
                return (
                  <ReactMarkdown
                    key={index}
                    components={markdownComponents}
                    remarkPlugins={[remarkGfm]}
                  >
                    {textContent}
                  </ReactMarkdown>
                );
              })
            ) : typeof msg.content === "string" ? (
              <ReactMarkdown
                components={markdownComponents}
                remarkPlugins={[remarkGfm]}
              >
                {msg.content}
              </ReactMarkdown>
            ) : (
              <pre className="text-xs whitespace-pre-wrap">
                {JSON.stringify(msg.content, null, 2)}
              </pre>
            )}
          </div>
        )}
      </>
    );
  };
};
