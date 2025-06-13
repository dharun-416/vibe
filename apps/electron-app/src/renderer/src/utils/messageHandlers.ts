import type { Message as AiSDKMessage } from "@ai-sdk/react";
import { parseReActContent } from "@/utils/reactParser";
import type {
  ChatMessage as VibeChatMessage,
  AgentProgress,
} from "@vibe/shared-types";

/**
 * Interface for message handlers
 * @interface MessageHandlers
 * @property {function} handleNewMessage - Function to handle new messages
 * @property {function} handleProgress - Function to handle progress
 */
export interface MessageHandlers {
  handleNewMessage: (message: VibeChatMessage) => void;
  handleProgress: (progress: AgentProgress) => void;
}

/**
 * Creates a message handler for the chat
 * @param setMessages - Function to set the messages
 * @param setIsAiGenerating - Function to set the AI generating state
 * @param streamTimeoutRef - Reference to the stream timeout
 * @param setStreamingContent - Function to set streaming content (reasoning, etc.)
 * @returns Message handlers
 */
export const createMessageHandler = (
  setMessages: (updater: (prev: AiSDKMessage[]) => AiSDKMessage[]) => void,
  setIsAiGenerating: (generating: boolean) => void,
  streamTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>,
  setStreamingContent?: (content: {
    reasoning?: string;
    response?: string;
  }) => void,
): MessageHandlers => {
  const handleNewMessage = (message: VibeChatMessage): void => {
    const isStreaming = (message as any).isStreaming || false;
    const parsedParts = parseReActContent(
      message.content,
      (message as any).parts,
      isStreaming,
    );

    // Handle streaming content separately - don't add to main message list
    if (isStreaming && setStreamingContent) {
      if (message.id.startsWith("reasoning-")) {
        const reasoningText = parsedParts
          .filter(p => (p.type as string) === "reasoning")
          .map(p => (p as { text?: string }).text || "")
          .join("\n");

        setStreamingContent({ reasoning: reasoningText });
        return; // Don't add to main message list
      }
      return; // Ignore other streaming messages
    }

    const aiMessage: AiSDKMessage = {
      id: message.id,
      role:
        message.role === "user"
          ? "user"
          : message.role === "assistant"
            ? "assistant"
            : "system",
      content: message.content,
      parts: parsedParts,
    };

    setMessages(prev => {
      if (
        message.role === "assistant" &&
        message.id.startsWith("assistant-final-")
      ) {
        // Clear streaming content when final message arrives
        if (setStreamingContent) {
          setStreamingContent({ reasoning: "", response: "" });
        }

        const lastUserMessageIndex = prev
          .map(msg => msg.role)
          .lastIndexOf("user");

        if (lastUserMessageIndex >= 0) {
          const keepMessages = prev.slice(0, lastUserMessageIndex + 1);
          return [...keepMessages, aiMessage];
        } else {
          return [...prev, aiMessage];
        }
      }

      if (message.role === "user") {
        return [...prev, aiMessage];
      }

      return prev;
    });

    if (
      message.role === "assistant" &&
      message.id.startsWith("assistant-final-")
    ) {
      if (streamTimeoutRef.current) {
        clearTimeout(streamTimeoutRef.current);
      }
      setIsAiGenerating(false);
    }
  };

  const handleProgress = (progress: AgentProgress): void => {
    const progressMessage: AiSDKMessage = {
      id: `agent-progress-${progress.type}-${Date.now()}`,
      role: "assistant",
      content: progress.message,
      parts: [
        { type: "agent-progress-icon" },
        { type: "text", text: progress.message },
      ] as any,
    };
    setMessages(prev => [...prev, progressMessage]);
  };

  return {
    handleNewMessage,
    handleProgress,
  };
};

export const setupMessageEventListeners = (handlers: MessageHandlers) => {
  const unsubscribeMessage = window.vibe?.chat?.onMessage?.(
    handlers.handleNewMessage,
  );
  const unsubscribeProgress = window.vibe?.chat?.onAgentProgress?.(
    handlers.handleProgress,
  );

  return () => {
    unsubscribeMessage?.();
    unsubscribeProgress?.();
  };
};
