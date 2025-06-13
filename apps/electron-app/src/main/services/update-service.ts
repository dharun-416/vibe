import { UPDATER } from "@vibe/shared-types";
import { app, BrowserWindow, dialog } from "electron";
import logger from "electron-log";
import { AppUpdater as _AppUpdater, autoUpdater } from "electron-updater";
// import { UpdateInfo } from "builder-util-runtime";

import icon from "../../../resources/icon.png?asset";

export default class AppUpdater {
  autoUpdater: _AppUpdater = autoUpdater;
  private releaseInfo: any | undefined;

  constructor(mainWindow: BrowserWindow) {
    logger.transports.file.level = "info";

    autoUpdater.logger = logger;
    autoUpdater.forceDevUpdateConfig = !app.isPackaged;
    autoUpdater.autoDownload = UPDATER.AUTOUPDATE;
    autoUpdater.autoInstallOnAppQuit = UPDATER.AUTOUPDATE;
    autoUpdater.setFeedURL(UPDATER.FEED_URL);

    autoUpdater.on("error", error => {
      logger.error("autoupdate", {
        message: error.message,
        stack: error.stack,
        time: new Date().toISOString(),
      });
      mainWindow.webContents.send("update-error", error);
    });

    autoUpdater.on("update-available", (releaseInfo: any) => {
      logger.info("update ready:", releaseInfo);
      mainWindow.webContents.send("update-available", releaseInfo);
    });

    autoUpdater.on("update-not-available", () => {
      mainWindow.webContents.send("update-not-available");
    });

    autoUpdater.on("download-progress", progress => {
      mainWindow.webContents.send("download-progress", progress);
    });

    autoUpdater.on("update-downloaded", (releaseInfo: any) => {
      mainWindow.webContents.send("update-downloaded", releaseInfo);
      this.releaseInfo = releaseInfo;
      logger.info("update downloaded:", releaseInfo);
    });

    this.autoUpdater = autoUpdater;
  }

  public setAutoUpdate(isActive: boolean) {
    autoUpdater.autoDownload = isActive;
    autoUpdater.autoInstallOnAppQuit = isActive;
  }

  public async checkForUpdates() {
    try {
      const update = await this.autoUpdater.checkForUpdates();
      if (update?.isUpdateAvailable && !this.autoUpdater.autoDownload) {
        this.autoUpdater.downloadUpdate();
      }

      return {
        currentVersion: this.autoUpdater.currentVersion,
        updateInfo: update?.updateInfo,
      };
    } catch (error) {
      logger.error("Failed to check for update:", error);
      return {
        currentVersion: app.getVersion(),
        updateInfo: null,
      };
    }
  }

  public async showUpdateDialog(mainWindow: BrowserWindow) {
    if (!this.releaseInfo) {
      return;
    }

    let detail = this.formatReleaseNotes(this.releaseInfo.releaseNotes);
    if (detail === "") {
      detail = "No Release Notes";
    }

    dialog
      .showMessageBox({
        type: "info",
        title: "Update",
        icon,
        message: this.releaseInfo.version,
        detail,
        buttons: ["later", "install"],
        defaultId: 1,
        cancelId: 0,
      })
      .then(({ response }) => {
        if (response === 1) {
          app.isQuitting = true;
          setImmediate(() => autoUpdater.quitAndInstall());
        } else {
          mainWindow.webContents.send("update-downloaded-cancelled");
        }
      });
  }

  private formatReleaseNotes(
    releaseNotes: string | ReleaseNoteInfo[] | null | undefined,
  ): string {
    if (!releaseNotes) {
      return "";
    }

    if (typeof releaseNotes === "string") {
      return releaseNotes;
    }

    return releaseNotes.map(note => note.note).join("\n");
  }
}

interface ReleaseNoteInfo {
  readonly version: string;
  readonly note: string | null;
}
