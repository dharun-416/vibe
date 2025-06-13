/**
 * @vibe/mcp-service - Professional MCP Server Service Wrapper
 *
 * Entry point for the MCP service package. This module provides:
 * - Process management for Python MCP server
 * - Health checking and monitoring
 * - Graceful startup and shutdown
 * - Event-driven architecture
 * - Professional logging and error handling
 */

import path from "path";
import dotenv from "dotenv";

// Load environment variables from workspace root
dotenv.config({
  path: path.resolve(__dirname, "../../../.env"),
});

import { logger } from "./logger";
import { createMcpService } from "./mcp-service";

// Export main service classes and functions
export { McpService, createMcpService } from "./mcp-service";
export { ProcessManager } from "./process-manager";
export { HealthChecker } from "./health-checker";
export { logger } from "./logger";

// Export types
export type {
  McpServerConfig,
  McpServerStatus,
  StartupOptions,
  McpServiceEvents,
  HealthCheckResponse,
} from "./types";

/**
 * Development mode entry point
 * When this package is run directly via `pnpm dev`, it starts the MCP service
 */
async function main() {
  try {
    logger.info("Starting MCP service in development mode");

    // Create service instance with default configuration
    const service = createMcpService();

    // Set up event listeners for monitoring
    service.on("started", status => {
      logger.info("Service started", { pid: status.pid });
    });

    service.on("healthy", status => {
      logger.info("Service is healthy", { url: status.url });
    });

    service.on("stopped", reason => {
      logger.info("Service stopped", { reason });
    });

    service.on("error", error => {
      logger.error("Service error:", error);
    });

    service.on("unhealthy", error => {
      logger.warn("Service became unhealthy:", error.message);
    });

    // Start the service and wait for it to be healthy
    await service.start({ waitForHealthy: true });

    logger.info("MCP service is running and healthy");

    // Keep the process alive
    process.on("SIGINT", async () => {
      logger.info("Received SIGINT, shutting down gracefully");
      await service.stop("SIGINT received");
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      logger.info("Received SIGTERM, shutting down gracefully");
      await service.stop("SIGTERM received");
      process.exit(0);
    });
  } catch (error) {
    logger.error("Failed to start MCP service:", error);
    process.exit(1);
  }
}

// Run main function if this module is executed directly
if (require.main === module) {
  main().catch(error => {
    logger.error("Unhandled error in main:", error);
    process.exit(1);
  });
}
