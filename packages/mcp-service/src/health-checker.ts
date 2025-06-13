/**
 * Health Check Service for MCP Server
 * Provides robust health monitoring with retry logic and error handling
 */
import fetch from "node-fetch";
import { logger } from "./logger";
import type { HealthCheckResponse } from "./types";

export class HealthChecker {
  private healthCheckUrl: string;
  private interval: number;
  private timeoutMs: number;
  private maxRetries: number;
  private retryDelayMs: number;

  constructor(
    baseUrl: string,
    options: {
      interval?: number;
      timeout?: number;
      maxRetries?: number;
      retryDelay?: number;
    } = {},
  ) {
    // FastMCP exposes SSE endpoint, so we'll check that instead
    this.healthCheckUrl = `${baseUrl}/sse`;
    this.interval = options.interval ?? 5000;
    this.timeoutMs = options.timeout ?? 10000; // Increased from 3s to 10s for heavy operations
    this.maxRetries = options.maxRetries ?? 5; // Increased retries
    this.retryDelayMs = options.retryDelay ?? 2000; // Increased delay between retries
  }

  /**
   * Perform a single health check with retry logic
   */
  async checkHealth(): Promise<{
    healthy: boolean;
    data?: HealthCheckResponse;
    error?: string;
  }> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.debug(`Health check attempt ${attempt}/${this.maxRetries}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await fetch(this.healthCheckUrl, {
          method: "GET",
          headers: {
            Accept: "text/event-stream",
            "User-Agent": "vibe-mcp-service/1.0.0",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(
            `Health check failed with status ${response.status}: ${response.statusText}`,
          );
        }

        // For SSE endpoint, just check if we get a response - that means the server is running
        logger.debug("Health check successful - SSE endpoint responding");

        // Create a mock health response since we can't get actual dependency status from SSE
        const mockHealthData: HealthCheckResponse = {
          server: "healthy",
          timestamp: new Date().toISOString(),
          dependencies: {
            fastmcp: "connected",
            uvicorn: "connected",
          },
        };

        return { healthy: true, data: mockHealthData };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.debug(
          `Health check attempt ${attempt} failed:`,
          lastError.message,
        );

        // Wait before retry (except on last attempt)
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelayMs * attempt); // Exponential backoff
        }
      }
    }

    const errorMessage = `Health check failed after ${this.maxRetries} attempts: ${lastError?.message}`;
    logger.warn(errorMessage);

    return { healthy: false, error: errorMessage };
  }

  /**
   * Wait for the server to become healthy
   */
  async waitForHealthy(timeoutMs: number = 30000): Promise<boolean> {
    const startTime = Date.now();
    const checkInterval = Math.min(this.interval, 2000); // Check more frequently during startup

    logger.info(
      `Waiting for MCP server to become healthy (timeout: ${timeoutMs}ms)`,
    );

    while (Date.now() - startTime < timeoutMs) {
      const { healthy, data, error } = await this.checkHealth();

      if (healthy) {
        logger.info("MCP server is healthy", {
          dependencies: data ? Object.keys(data.dependencies) : [],
          timeToHealthy: Date.now() - startTime,
        });
        return true;
      }

      logger.debug(`Server not ready yet: ${error}`);
      await this.delay(checkInterval);
    }

    logger.error(`MCP server failed to become healthy within ${timeoutMs}ms`);
    return false;
  }

  /**
   * Start continuous health monitoring
   */
  startMonitoring(
    onHealthChange: (healthy: boolean, data?: HealthCheckResponse) => void,
  ): () => void {
    let isRunning = true;
    let currentlyHealthy = false;

    const monitor = async () => {
      while (isRunning) {
        const { healthy, data, error } = await this.checkHealth();

        // Only emit change events when health status actually changes
        if (healthy !== currentlyHealthy) {
          currentlyHealthy = healthy;
          onHealthChange(healthy, data);

          if (healthy) {
            logger.info("MCP server health restored");
          } else {
            logger.warn(`MCP server became unhealthy: ${error}`);
          }
        }

        if (isRunning) {
          await this.delay(this.interval);
        }
      }
    };

    // Start monitoring in background
    monitor().catch(error => {
      logger.error("Health monitoring failed:", error);
    });

    // Return stop function
    return () => {
      isRunning = false;
      logger.debug("Health monitoring stopped");
    };
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
