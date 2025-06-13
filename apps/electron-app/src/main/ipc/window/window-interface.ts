import { ipcMain } from "electron";
import { browser } from "@/index";

/**
 * Window interface management handlers
 * Direct approach - no registration functions needed
 */

ipcMain.handle("interface:get-window-id", async event => {
  const senderWindow = browser?.getWindowFromWebContents(event.sender);
  return senderWindow?.id || null;
});

ipcMain.handle("interface:get-all-windows", async () => {
  const windows = browser?.getAllWindows() || [];
  return windows.map(window => ({
    windowId: window.id,
    isMainWindow: window === browser?.getMainWindow(),
    isVisible: window.isVisible(),
    isFocused: window.isFocused(),
    isMinimized: window.isMinimized(),
    isMaximized: window.isMaximized(),
    bounds: window.getBounds(),
  }));
});

ipcMain.handle("interface:get-window-state", async event => {
  const senderWindow = browser?.getWindowFromWebContents(event.sender);
  if (!senderWindow) return null;

  return {
    windowId: senderWindow.id,
    isMaximized: senderWindow.isMaximized(),
    isMinimized: senderWindow.isMinimized(),
    isFullScreen: senderWindow.isFullScreen(),
    bounds: senderWindow.getBounds(),
  };
});

ipcMain.on("interface:move-window-to", (event, x: number, y: number) => {
  const senderWindow = browser?.getWindowFromWebContents(event.sender);
  if (senderWindow) {
    senderWindow.setPosition(x, y);
  }
});

ipcMain.on(
  "interface:resize-window-to",
  (event, width: number, height: number) => {
    const senderWindow = browser?.getWindowFromWebContents(event.sender);
    if (senderWindow) {
      senderWindow.setSize(width, height);
    }
  },
);

ipcMain.on("interface:set-window-bounds", (event, bounds) => {
  const senderWindow = browser?.getWindowFromWebContents(event.sender);
  if (senderWindow) {
    senderWindow.setBounds(bounds);
  }
});
