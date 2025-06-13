import { ipcMain } from "electron";
import { mainStore } from "@/store/store";

/**
 * Session persistence handlers
 */

ipcMain.handle("session:save", async () => {
  return { success: true };
});

ipcMain.handle("session:load", async () => {
  return { success: true };
});

ipcMain.handle("session:clear", async () => {
  mainStore.setState({
    messages: [],
    requestedTabContext: [],
    sessionTabs: [],
  });
  return { success: true };
});
