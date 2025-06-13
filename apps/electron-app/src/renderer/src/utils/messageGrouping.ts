import { GroupedMessage } from "@/components/chat/Messages";
import type { Message as AiSDKMessage } from "@ai-sdk/react";

export const groupMessages = (messages: AiSDKMessage[]): GroupedMessage[] => {
  const grouped: GroupedMessage[] = [];
  let currentGroup: GroupedMessage | null = null;

  messages.forEach(msg => {
    if (msg.role === "user") {
      if (currentGroup) {
        grouped.push(currentGroup);
      }
      currentGroup = {
        id: msg.id,
        userMessage: msg,
        assistantMessages: [],
      };
    } else if (!["user", "data"].includes(msg.role as string)) {
      if (currentGroup) {
        currentGroup.assistantMessages.push(msg);
      } else {
        grouped.push({
          id: msg.id,
          userMessage: {
            id: `system-placeholder-${msg.id}`,
            role: "system",
            content: "Initial Message",
          },
          assistantMessages: [msg],
        });
        currentGroup = null;
        return;
      }
    }
    if (msg === messages[messages.length - 1] && currentGroup) {
      grouped.push(currentGroup);
    }
  });
  return grouped.filter(g => g.userMessage || g.assistantMessages.length > 0);
};
