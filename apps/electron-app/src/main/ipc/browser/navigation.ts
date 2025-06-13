import { ipcMain } from "electron";
import { browser } from "@/index";
import { createLogger } from "@vibe/shared-types";

const logger = createLogger("NavigationIPC");

/**
 * Page navigation IPC handlers
 * Window-specific approach using event.sender.id auto-detection
 */

ipcMain.handle("page:navigate", async (event, tabKey: string, url: string) => {
  try {
    const appWindow = browser?.getApplicationWindow(event.sender.id);
    if (!appWindow) throw new Error("No application window found");

    return await appWindow.tabManager.loadUrl(tabKey, url);
  } catch (error) {
    logger.error("Failed to navigate:", error);
    throw error;
  }
});

ipcMain.handle("page:goBack", async (event, tabKey: string) => {
  try {
    const appWindow = browser?.getApplicationWindow(event.sender.id);
    if (!appWindow) throw new Error("No application window found");

    return appWindow.tabManager.goBack(tabKey);
  } catch (error) {
    logger.error("Failed to go back:", error);
    throw error;
  }
});

ipcMain.handle("page:goForward", async (event, tabKey: string) => {
  try {
    const appWindow = browser?.getApplicationWindow(event.sender.id);
    if (!appWindow) throw new Error("No application window found");

    return appWindow.tabManager.goForward(tabKey);
  } catch (error) {
    logger.error("Failed to go forward:", error);
    throw error;
  }
});

ipcMain.handle("page:reload", async (event, tabKey: string) => {
  try {
    const appWindow = browser?.getApplicationWindow(event.sender.id);
    if (!appWindow) throw new Error("No application window found");

    return appWindow.tabManager.refresh(tabKey);
  } catch (error) {
    logger.error("Failed to reload:", error);
    throw error;
  }
});

ipcMain.on("page:stop", event => {
  const appWindow = browser?.getApplicationWindow(event.sender.id);
  if (!appWindow) return;

  const activeViewKey = appWindow.viewManager.getActiveViewKey();
  const activeView = activeViewKey
    ? appWindow.viewManager.getBrowserView(activeViewKey)
    : null;
  if (activeView && !activeView.webContents.isDestroyed()) {
    activeView.webContents.stop();
  }
});
