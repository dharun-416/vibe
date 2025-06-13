import type { Message as AiSDKMessage } from "@ai-sdk/react";
import type { ChatMessage } from "@vibe/shared-types";

export const convertZustandToAiSDKMessages = (
  messages: ChatMessage[],
): AiSDKMessage[] => {
  return messages.map(msg => ({
    id: msg.id,
    role:
      (msg as any).role === "user" || (msg as any).sender === "user"
        ? "user"
        : (msg as any).role === "assistant" || (msg as any).sender === "ai"
          ? "assistant"
          : "system",
    content: (msg as any).content || (msg as any).value || "",
    parts: (msg as any).parts
      ? ((msg as any).parts as AiSDKMessage["parts"])
      : [
          {
            type: "text",
            text: (msg as any).content || (msg as any).value || "",
          },
        ],
  }));
};
