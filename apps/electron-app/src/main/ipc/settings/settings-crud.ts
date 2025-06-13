import { ipcMain } from "electron";

/**
 * Settings CRUD handlers
 * Direct approach - no registration functions needed
 */

ipcMain.handle("settings:get", async () => {
  // Settings persistence not implemented - return null
  return null;
});

ipcMain.handle("settings:set", async () => {
  // Settings persistence not implemented - return success for compatibility
  return true;
});

ipcMain.handle("settings:remove", async () => {
  // Settings persistence not implemented - return success for compatibility
  return true;
});

ipcMain.handle("settings:get-all", async () => {
  // Settings persistence not implemented - return empty object
  return {};
});
