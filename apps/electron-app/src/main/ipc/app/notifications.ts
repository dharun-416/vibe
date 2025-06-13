import { ipcMain, Notification } from "electron";

/**
 * System notification handlers
 * Direct approach - no registration functions needed
 */

ipcMain.on("app:show-notification", (_event, title: string, body: string) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
});
