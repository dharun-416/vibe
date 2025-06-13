/**
 * MCP Service - Main service class orchestrating process and health management
 * Professional implementation with event-driven architecture
 */
import { EventEmitter } from "events";
import path from "path";
import { ProcessManager } from "./process-manager";
import { HealthChecker } from "./health-checker";
import { createLogger } from "@vibe/shared-types";

const logger = createLogger("McpService");
import type {
  McpServerConfig,
  McpServerStatus,
  StartupOptions,
  McpServiceEvents,
  HealthCheckResponse,
} from "./types";

export class McpService extends EventEmitter<McpServiceEvents> {
  private processManager: ProcessManager;
  private healthChecker: HealthChecker;
  private healthMonitorStop: (() => void) | null = null;
  private isStarting = false;

  constructor(config: McpServerConfig) {
    super();

    // Initialize process manager
    this.processManager = new ProcessManager(config);

    // Initialize health checker with more resilient settings
    const serverUrl = `http://${config.host ?? "localhost"}:${config.port}`;
    this.healthChecker = new HealthChecker(serverUrl, {
      interval: config.healthCheckInterval,
      timeout: 10000, // 10 seconds for heavy operations
      maxRetries: 5,
      retryDelay: 2000,
    });

    // Forward process manager events
    this.processManager.on("started", status => this.emit("started", status));
    this.processManager.on("stopped", reason => this.emit("stopped", reason));
    this.processManager.on("error", error => this.emit("error", error));
    this.processManager.on("unhealthy", error => this.emit("unhealthy", error));

    // Handle health state changes
    this.processManager.on("healthy", status => this.emit("healthy", status));
  }

  /**
   * Get current service status
   */
  getStatus(): McpServerStatus {
    return this.processManager.getStatus();
  }

  /**
   * Start the MCP service
   */
  async start(options: StartupOptions = {}): Promise<McpServerStatus> {
    if (this.isStarting) {
      throw new Error("MCP service is already starting");
    }

    if (this.processManager.getStatus().isRunning) {
      logger.warn("MCP service is already running");
      return this.processManager.getStatus();
    }

    this.isStarting = true;

    try {
      logger.info("Starting MCP service");

      // Start the process
      const status = await this.processManager.start(options);

      // Start health monitoring
      this.startHealthMonitoring();

      // Wait for health if requested
      if (options.waitForHealthy !== false) {
        const timeoutMs = 30000; // 30 seconds default timeout
        logger.info("Waiting for MCP server to become healthy");

        const isHealthy = await this.healthChecker.waitForHealthy(timeoutMs);
        if (!isHealthy) {
          await this.stop("Failed to become healthy within timeout");
          throw new Error(
            `MCP server failed to become healthy within ${timeoutMs}ms`,
          );
        }

        // Mark as healthy in process manager
        this.processManager.markHealthy();
      }

      logger.info("MCP service started successfully", {
        pid: status.pid,
        port: status.url ? new URL(status.url).port : "unknown",
      });

      return this.processManager.getStatus();
    } catch (error) {
      logger.error("Failed to start MCP service:", error);
      await this.stop("Startup failed");
      throw error;
    } finally {
      this.isStarting = false;
    }
  }

  /**
   * Stop the MCP service
   */
  async stop(reason: string = "Manual shutdown"): Promise<void> {
    logger.info("Stopping MCP service", { reason });

    try {
      // Stop health monitoring
      this.stopHealthMonitoring();

      // Stop the process
      await this.processManager.stop(reason);

      logger.info("MCP service stopped successfully");
    } catch (error) {
      logger.error("Error stopping MCP service:", error);
      throw error;
    }
  }

  /**
   * Restart the MCP service
   */
  async restart(
    reason: string = "Manual restart",
    options: StartupOptions = {},
  ): Promise<McpServerStatus> {
    logger.info("Restarting MCP service", { reason });

    await this.stop(reason);

    // Brief delay to ensure clean shutdown
    await new Promise(resolve => setTimeout(resolve, 1000));

    return this.start(options);
  }

  /**
   * Check if the service is healthy
   */
  async checkHealth(): Promise<{
    healthy: boolean;
    data?: HealthCheckResponse;
    error?: string;
  }> {
    return this.healthChecker.checkHealth();
  }

  /**
   * Wait for the service to become healthy
   */
  async waitForHealthy(timeoutMs: number = 30000): Promise<boolean> {
    return this.healthChecker.waitForHealthy(timeoutMs);
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    if (this.healthMonitorStop) {
      logger.debug("Health monitoring is already running");
      return;
    }

    logger.debug("Starting health monitoring");

    this.healthMonitorStop = this.healthChecker.startMonitoring(
      (healthy, _data) => {
        if (healthy) {
          this.processManager.markHealthy();
        } else {
          this.processManager.markUnhealthy(new Error("Health check failed"));
        }
      },
    );
  }

  /**
   * Stop health monitoring
   */
  private stopHealthMonitoring(): void {
    if (this.healthMonitorStop) {
      logger.debug("Stopping health monitoring");
      this.healthMonitorStop();
      this.healthMonitorStop = null;
    }
  }
}

/**
 * Create and configure MCP service instance
 */
export function createMcpService(
  config: Partial<McpServerConfig> = {},
): McpService {
  // Default configuration pointing to the Python MCP server
  const defaultConfig: McpServerConfig = {
    pythonPath: process.env.PYPATH ? process.env.PYPATH : undefined,
    projectPath: path.resolve(
      process.cwd(),
      "../../apps/mcp-server/vibe-memory-rag",
    ),
    port: 8052,
    host: "localhost",
    env: {
      LOG_LEVEL: "INFO", // Force Python logging level to valid string
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "",
      NODE_ENV: process.env.NODE_ENV ?? "development",
    },
    startupTimeout: 30000,
    healthCheckInterval: 5000,
  };

  const finalConfig = { ...defaultConfig, ...config };
  logger.debug("[MCPSERVICE]:finakConfig => ", finalConfig);
  // Validate required environment variables
  if (!finalConfig.env?.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is required");
  }
  logger.info(
    "Creating MCP service",
    finalConfig.projectPath,
    finalConfig.pythonPath,
  );

  logger.info("Creating MCP service", {
    projectPath: finalConfig.projectPath,
    port: finalConfig.port,
    host: finalConfig.host,
  });

  return new McpService(finalConfig);
}
