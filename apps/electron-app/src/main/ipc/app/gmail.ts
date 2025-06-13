import { ipcMain } from "electron";

/**
 * Gmail OAuth handlers
 * Direct approach - no registration functions needed
 */

ipcMain.handle("gmail-check-auth", async () => {
  const { gmailOAuthService } = await import("@/services/gmail-service");
  return await gmailOAuthService.checkAuth();
});

ipcMain.handle("gmail-start-auth", async () => {
  const { gmailOAuthService } = await import("@/services/gmail-service");
  return await gmailOAuthService.startAuth();
});

ipcMain.handle("gmail-clear-auth", async () => {
  const { gmailOAuthService } = await import("@/services/gmail-service");
  return await gmailOAuthService.clearAuth();
});
