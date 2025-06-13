import { useEffect, useRef } from "react";
import type { Message as AiSDKMessage } from "@ai-sdk/react";
import { useAppStore } from "@/hooks/useStore";
import { convertZustandToAiSDKMessages } from "@/utils/messageConverter";

export const useChatRestore = (
  setMessages: (messages: AiSDKMessage[]) => void,
) => {
  const { zustandMessages } = useAppStore(state => ({
    zustandMessages: state.messages,
  }));

  const isInitialLoadRef = useRef(true);
  const isRestoreModeRef = useRef(false);

  useEffect(() => {
    if (isInitialLoadRef.current && zustandMessages.length > 0) {
      isRestoreModeRef.current = true;
      const convertedMessages = convertZustandToAiSDKMessages(zustandMessages);
      setMessages(convertedMessages);
      isInitialLoadRef.current = false;
      isRestoreModeRef.current = false;
    }
  }, [zustandMessages, setMessages]);

  return {
    isRestoreModeRef,
  };
};
