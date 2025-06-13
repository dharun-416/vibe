import { ipcMain } from "electron";
import { mainStore } from "@/store/store";
import { createLogger } from "@vibe/shared-types";

const logger = createLogger("ChatHistory");

/**
 * Chat history management handlers
 * Direct approach - no registration functions needed
 */

ipcMain.handle("chat:get-history", async () => {
  const currentState = mainStore.getState();
  const chatHistory = currentState.messages;
  logger.info(
    `Returning chat history from shared store: ${chatHistory.length} messages`,
  );
  return chatHistory;
});

ipcMain.on("chat:clear-history", async event => {
  try {
    mainStore.setState({
      messages: [],
    });
    logger.info("Chat history cleared from shared store");
    event.sender.send("chat:message", {
      type: "info",
      message: "Chat history has been cleared",
    });
  } catch (error) {
    logger.error("Failed to clear history:", error);
    event.sender.send("chat:message", {
      type: "error",
      error: "Failed to clear chat history",
    });
  }
});
