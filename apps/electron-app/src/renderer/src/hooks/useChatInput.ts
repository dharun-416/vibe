import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import type { Message as AiSDKMessage } from "@ai-sdk/react";

export const useChatInput = (
  setMessages: (updater: (prev: AiSDKMessage[]) => AiSDKMessage[]) => void,
) => {
  const { input, handleInputChange, setInput, status } = useChat({});
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const sendMessage = (content: string) => {
    const userMessage: AiSDKMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      parts: [{ type: "text", text: content }],
    };

    setMessages(prev => [...prev, userMessage]);
    setIsAiGenerating(true);

    // Track chat message sent
    (window as any).umami?.track?.("chat-message-sent", {
      length: content.length,
      timestamp: Date.now(),
    });

    window.vibe?.chat?.sendMessage?.(content);
    setInput("");
  };

  const stopGeneration = () => {
    setIsAiGenerating(false);
  };

  const isSending =
    isAiGenerating || status === "streaming" || status === "submitted";

  return {
    input,
    handleInputChange,
    sendMessage,
    stopGeneration,
    isSending,
    isAiGenerating,
    setIsAiGenerating,
  };
};
