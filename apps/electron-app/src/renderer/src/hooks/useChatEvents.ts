import { useEffect, useRef } from "react";
import type { Message as AiSDKMessage } from "@ai-sdk/react";
import {
  createMessageHandler,
  setupMessageEventListeners,
} from "@/utils/messageHandlers";

export const useChatEvents = (
  setMessages: (updater: (prev: AiSDKMessage[]) => AiSDKMessage[]) => void,
  setIsAiGenerating: (generating: boolean) => void,
  setStreamingContent?: (content: {
    reasoning?: string;
    response?: string;
  }) => void,
) => {
  const streamTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const messageHandlers = createMessageHandler(
      setMessages,
      setIsAiGenerating,
      streamTimeoutRef,
      setStreamingContent,
    );

    const cleanup = setupMessageEventListeners(messageHandlers);

    return cleanup;
  }, [setMessages, setIsAiGenerating, setStreamingContent]);

  return {
    streamTimeoutRef,
  };
};
