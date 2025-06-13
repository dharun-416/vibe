import { ipcMain } from "electron";

/**
 * App info and platform handlers
 * Direct approach - no registration functions needed
 */

ipcMain.handle("app:get-info", async () => {
  return {
    name: "Vibe Browser",
    version: process.env.npm_package_version || "1.0.0",
    platform: process.platform,
  };
});
