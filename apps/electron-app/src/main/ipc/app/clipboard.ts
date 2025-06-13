import { ipcMain, clipboard } from "electron";

/**
 * Clipboard operation handlers
 * Direct approach - no registration functions needed
 */

ipcMain.handle("app:read-clipboard", async () => {
  return clipboard.readText();
});

ipcMain.on("app:write-clipboard", (_event, text: string) => {
  clipboard.writeText(text);
});
