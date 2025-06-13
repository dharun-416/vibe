import { ipcMain } from "electron";
import { mainStore } from "@/store/store";
import type { AppState } from "@/store/types";

/**
 * State management handlers
 * Direct approach - no registration functions needed
 */

ipcMain.handle("session:get-state", () => {
  return mainStore.getState();
});

ipcMain.handle("zustand-getState", () => {
  return mainStore.getState();
});

ipcMain.on("session:set-state", (_event, newState: Partial<AppState>) => {
  mainStore.setState(newState);
});
