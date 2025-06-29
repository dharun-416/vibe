import { ipcMain } from "electron";

/**
 * Settings management handlers
 * Direct approach - no registration functions needed
 */

ipcMain.handle("settings:reset", async () => {
  // Settings reset not implemented - return success for compatibility
  return true;
});

ipcMain.handle("settings:export", async () => {
  // Settings export not implemented - return empty configuration
  return "{}";
});

ipcMain.handle("settings:import", async () => {
  // Settings import not implemented - return success for compatibility
  return true;
});
