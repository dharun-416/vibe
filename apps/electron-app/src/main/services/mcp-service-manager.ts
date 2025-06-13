/**
 * MCP Service Manager for Electron App
 * Handles MCP service lifecycle within the electron application
 */
import { McpService, createMcpService } from "@vibe/mcp-service";
import type { McpServerStatus } from "@vibe/mcp-service";
import * as cp from "child_process";
import path from "path";
import fs from "fs";
import { app } from "electron";
import { createLogger } from "@vibe/shared-types";

const logger = createLogger("McpServiceManager");
interface ProcessLogEntry {
  type: "start" | "stderr" | "stdout" | "error" | "end";
  command: string;
  args: string[];
  stderr?: string;
  stdout?: string;
  error?: string;
  duration?: number; // duration in milliseconds
}

class McpServiceManager {
  private service: McpService | null = null;
  private isInitialized = false;

  /**
   * Initialize the MCP service connection
   * This connects to an existing MCP service instead of starting a new one
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.debug("[McpServiceManager] Service already initialized");
      return;
    }

    try {
      logger.debug("[McpServiceManager] Connecting to existing MCP service...");
      let pythonPath;
      let projectPath;
      if (app.isPackaged) {
        pythonPath = path.join(
          process.resourcesPath,
          "app.asar.unpacked",
          "dist-py",
          "mcp-server-backend",
        );
        projectPath = path.join(process.resourcesPath, "dist-py");
      } else {
        projectPath = path.join(__dirname, "apps", "electron-app", "dist-py");
        pythonPath = path.join(
          __dirname,
          "apps",
          "electron-app",
          "dist-py",
          "mcp-server-backend",
        );
      }

      // Create the service instance but don't start it - just connect
      this.service = createMcpService({
        port: 8052,
        host: "localhost",
        pythonPath: pythonPath,
        projectPath: projectPath,
        env: {
          OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
          LOG_LEVEL: process.env.LOG_LEVEL || "INFO",
          NODE_ENV: process.env.NODE_ENV || "development",
        },
      });

      // Set up event listeners for monitoring
      this.setupEventListeners();

      // Just check if the service is healthy (don't start it)
      logger.debug(
        "[McpServiceManager] Checking MCP service health...",
        pythonPath,
        projectPath,
      );
      const isHealthy = await this.service.waitForHealthy(10000);

      if (isHealthy) {
        // Mark the process manager as healthy since we found an existing service
        this.service["processManager"].markHealthy();
        this.isInitialized = true;
        logger.debug(
          "[McpServiceManager] Successfully connected to existing MCP service",
        );
      } else {
        logger.warn(
          "[McpServiceManager] Could not connect to MCP service - will continue without it",
        );
        this.isInitialized = true; // Don't fail the whole app
      }
    } catch (error) {
      logger.warn(
        "[McpServiceManager] Failed to connect to MCP service, continuing without it:",
        error,
      );
      this.isInitialized = true; // Don't fail the whole app
    }
  }
  private processLog(entry: ProcessLogEntry): void {
    logger.debug(`[${entry.type}] ${entry.command} ${entry.args.join(" ")}`);
    if (entry.stderr) {
      logger.error(`  Stderr: ${entry.stderr}`);
    }
    if (entry.stdout) {
      logger.debug(`  Stdout: ${entry.stdout}`);
    }
    if (entry.error) {
      logger.error(`  Error: ${entry.error}`);
    }
    if (entry.duration !== undefined) {
      logger.debug(`  Duration: ${entry.duration}ms`);
    }
  }
  findPython(): string {
    const possibilities: string[] = [
      // In packaged app
      path.join(process.resourcesPath, "python", "bin", "python3.10"),
      // In development
      path.join(__dirname, "python", "bin", "python3.10"),
    ];

    for (const pythonPath of possibilities) {
      if (fs.existsSync(pythonPath)) {
        return pythonPath;
      }
    }

    logger.debug("Could not find python3, checked", possibilities);

    throw new Error("Python 3.10 not found. Application is quitting.");
  }

  public async execCommand(
    command: string,
    args: string[],
  ): Promise<cp.ChildProcess> {
    return new Promise((resolve, reject) => {
      // Use spawn() not execFile() so we can tail stdout/stderr
      logger.debug("[McpServiceManager] exec: ", command, args);

      const start: number = new Date().valueOf(); // millisecond timestamp
      const process: cp.ChildProcessWithoutNullStreams = cp.spawn(
        command,
        args,
      );
      const collectedErr: string[] = [];

      this.processLog({
        type: "start",
        command,
        args,
      });

      process.stderr.on("data", (data: Buffer) => {
        for (const line of data.toString().split("\n")) {
          const trimmedLine = line.trim();
          if (trimmedLine) {
            // Only log non-empty lines
            this.processLog({
              type: "stderr",
              command,
              args,
              stderr: trimmedLine,
            });
            collectedErr.push(trimmedLine);
          }
        }
      });

      process.stdout.on("data", (data: Buffer) => {
        for (const line of data.toString().split("\n")) {
          const trimmedLine = line.trim();
          if (trimmedLine) {
            // Only log non-empty lines
            this.processLog({
              type: "stdout",
              command,
              args,
              stdout: trimmedLine,
            });
          }
        }
      });

      process.on("error", (err: Error) => {
        this.processLog({
          type: "error",
          command,
          args,
          error: err.toString(),
        });
        reject(err);
      });

      process.on("exit", (code: number | null, signal: string | null) => {
        const duration_ms: number = new Date().valueOf() - start;
        this.processLog({
          type: "end",
          command,
          args,
          duration: duration_ms,
        });

        if (code === 0) {
          resolve(process);
        } else {
          // If there's an exit code, it's an error. Prioritize collected stderr.
          const errorMessage =
            collectedErr.length > 0
              ? collectedErr.join("\n")
              : `Command exited with code ${code || "null"} (signal: ${signal || "none"})`;
          reject(new Error(errorMessage));
        }
      });
    });
  }

  /**
   * Get the current service status
   */
  getStatus(): McpServerStatus | null {
    return this.service?.getStatus() || null;
  }

  /**
   * Check if the service is running and healthy
   */
  isHealthy(): boolean {
    const status = this.getStatus();
    return status?.isRunning === true && status?.isHealthy === true;
  }

  /**
   * Get the service URL if available
   */
  getServiceUrl(): string | null {
    const status = this.getStatus();
    return status?.url || null;
  }

  /**
   * Shutdown the MCP service
   */
  async shutdown(): Promise<void> {
    if (!this.service) {
      logger.debug("[McpServiceManager] No service to shutdown");
      return;
    }

    try {
      logger.debug("[McpServiceManager] Shutting down MCP service...");
      await this.service.stop("Application shutdown");
      this.isInitialized = false;
      logger.debug("[McpServiceManager] MCP service shutdown completed");
    } catch (error) {
      logger.error(
        "[McpServiceManager] Error during MCP service shutdown:",
        error,
      );
    }
  }

  /**
   * Restart the MCP service
   */
  async restart(): Promise<void> {
    if (!this.service) {
      throw new Error("MCP service not initialized");
    }

    try {
      logger.debug("[McpServiceManager] Restarting MCP service...");
      await this.service.restart("Manual restart", { waitForHealthy: true });
      logger.debug("[McpServiceManager] MCP service restarted successfully");
    } catch (error) {
      logger.error("[McpServiceManager] Failed to restart MCP service:", error);
      throw error;
    }
  }

  /**
   * Setup event listeners for service monitoring
   */
  private setupEventListeners(): void {
    if (!this.service) return;

    this.service.on("started", status => {
      logger.debug("[McpServiceManager] Service started", { pid: status.pid });
    });

    this.service.on("healthy", status => {
      logger.debug("[McpServiceManager] Service is healthy", {
        url: status.url,
      });
    });

    this.service.on("stopped", reason => {
      logger.debug("[McpServiceManager] Service stopped", { reason });
    });

    this.service.on("error", error => {
      logger.error("[McpServiceManager] Service error:", error);
    });

    this.service.on("unhealthy", error => {
      logger.warn(
        "[McpServiceManager] Service became unhealthy:",
        error.message,
      );
    });
  }
}

// Export singleton instance
export const mcpServiceManager = new McpServiceManager();
