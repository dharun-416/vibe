import { ipcMain } from "electron";
import { browser } from "@/index";

/**
 * Window and view management IPC handlers
 * Window-specific approach using event.sender.id auto-detection
 */

// Window management
ipcMain.on("browser:create-window", () => {
  browser?.createWindow();
});

ipcMain.handle("browser:get-window-state", async event => {
  const appWindow = browser?.getApplicationWindow(event.sender.id);
  if (!appWindow) return null;

  const window = appWindow.window;
  return {
    isMaximized: window.isMaximized(),
    isMinimized: window.isMinimized(),
    isFullScreen: window.isFullScreen(),
    bounds: window.getBounds(),
  };
});

ipcMain.on("browser:close-window", event => {
  const appWindow = browser?.getApplicationWindow(event.sender.id);
  if (appWindow) {
    appWindow.window.close();
  }
});

// View management
ipcMain.handle("browser:refresh-view-layout", async event => {
  const appWindow = browser?.getApplicationWindow(event.sender.id);
  if (!appWindow) return false;

  appWindow.viewManager.updateBounds();
  return true;
});

ipcMain.handle("browser:get-view-visibility-states", async event => {
  const appWindow = browser?.getApplicationWindow(event.sender.id);
  if (!appWindow) return {};

  // ViewManager doesn't expose visibility states directly
  const tabs = appWindow.tabManager.getAllTabs();
  const states: Record<string, boolean> = {};
  tabs.forEach(tab => {
    states[tab.key] = tab.visible || false;
  });
  return states;
});

ipcMain.handle(
  "browser:set-view-visibility",
  async (event, tabKey: string, visible: boolean) => {
    const appWindow = browser?.getApplicationWindow(event.sender.id);
    return appWindow?.viewManager.setViewVisible(tabKey, visible) || false;
  },
);

// Memory management
ipcMain.handle("browser:optimize-memory", async event => {
  const appWindow = browser?.getApplicationWindow(event.sender.id);
  if (!appWindow) return false;

  // TabManager handles maintenance automatically, just return success
  return true;
});

ipcMain.handle("browser:get-memory-usage", async event => {
  const appWindow = browser?.getApplicationWindow(event.sender.id);
  if (!appWindow) return { total: 0, tabs: [] };

  // Get memory info from window's tabs
  const tabs = appWindow.tabManager.getAllTabs();
  return {
    total: tabs.length,
    tabs: tabs.map(tab => ({
      key: tab.key,
      title: tab.title,
      url: tab.url,
      asleep: tab.asleep || false,
    })),
  };
});
