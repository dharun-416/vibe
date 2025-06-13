import React from "react";
import type { GroupedMessage } from "../components/chat/Messages";

export const useBrowserProgressTracking = (
  groupedMessages: GroupedMessage[],
) => {
  const [activeBrowserTaskId, setActiveBrowserTaskId] = React.useState<
    string | null
  >(null);

  React.useEffect(() => {
    const lastGroup = groupedMessages[groupedMessages.length - 1];
    if (lastGroup) {
      const hasNonProgressAssistantMessage = lastGroup.assistantMessages.some(
        msg => !msg.id.startsWith("agent-progress-"),
      );
      if (hasNonProgressAssistantMessage && activeBrowserTaskId) {
        setActiveBrowserTaskId(null);
      }
    }
  }, [groupedMessages, activeBrowserTaskId]);

  return {
    activeBrowserTaskId,
    setActiveBrowserTaskId,
  };
};
