import { ipcMain } from "electron";
import { browser } from "@/index";

/**
 * Window state management handlers
 * Direct approach - no registration functions needed
 */

ipcMain.on("app:minimize", event => {
  const senderWindow = browser?.getWindowFromWebContents(event.sender);
  if (senderWindow) {
    senderWindow.minimize();
  }
});

ipcMain.on("app:maximize", event => {
  const senderWindow = browser?.getWindowFromWebContents(event.sender);
  if (senderWindow) {
    if (senderWindow.isMaximized()) {
      senderWindow.unmaximize();
    } else {
      senderWindow.maximize();
    }
  }
});

ipcMain.on("app:close", event => {
  const senderWindow = browser?.getWindowFromWebContents(event.sender);
  if (senderWindow) {
    senderWindow.close();
  }
});

ipcMain.on("app:set-fullscreen", (event, fullscreen: boolean) => {
  const senderWindow = browser?.getWindowFromWebContents(event.sender);
  if (senderWindow) {
    senderWindow.setFullScreen(fullscreen);
  }
});
