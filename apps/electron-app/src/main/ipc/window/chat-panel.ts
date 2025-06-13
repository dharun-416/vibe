import { ipcMain } from "electron";
import { browser } from "@/index";
import { createLogger } from "@vibe/shared-types";

const logger = createLogger("ChatPanelIPC");

/**
 * Chat panel management handlers
 * Window-specific approach using event.sender.id auto-detection
 */

ipcMain.on("toggle-custom-chat-area", (event, isVisible: boolean) => {
  const appWindow = browser?.getApplicationWindow(event.sender.id);
  if (!appWindow) return;

  appWindow.viewManager.toggleChatPanel(isVisible);
  appWindow.window.webContents.send("chat-area-visibility-changed", isVisible);
});

ipcMain.handle("interface:get-chat-panel-state", async event => {
  const appWindow = browser?.getApplicationWindow(event.sender.id);
  if (!appWindow) return { isVisible: false };

  return appWindow.viewManager.getChatPanelState();
});

ipcMain.on(
  "interface:set-chat-panel-width",
  (_event, widthPercentage: number) => {
    logger.info(`Setting chat panel width to ${widthPercentage}%`);
  },
);
