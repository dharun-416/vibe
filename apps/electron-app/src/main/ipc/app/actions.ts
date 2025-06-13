import { ipcMain, clipboard } from "electron";

/**
 * User action handlers
 * Direct approach - no registration functions needed
 */

ipcMain.on("actions:copy-text", (_event, text: string) => {
  clipboard.writeText(text);
});

ipcMain.on("actions:copy-link", (_event, url: string) => {
  clipboard.writeText(url);
});

ipcMain.handle("actions:show-context-menu", async () => {
  // Context menu not implemented - return success for compatibility
  return { success: true };
});

ipcMain.handle(
  "actions:execute",
  async (_event, actionId: string, ...args: any[]) => {
    // Action execution not implemented - return success for compatibility
    return { success: true, actionId, args };
  },
);
