/**
 * Type definitions for MCP Service
 */

export interface McpServerConfig {
  /** Python executable path (optional, defaults to system python) */
  pythonPath?: string;
  /** MCP server project directory */
  projectPath: string;
  /** Server port */
  port: number;
  /** Server host */
  host?: string;
  /** Environment variables */
  env?: Record<string, string>;
  /** Startup timeout in milliseconds */
  startupTimeout?: number;
  /** Health check interval in milliseconds */
  healthCheckInterval?: number;
}

export interface McpServerStatus {
  /** Whether the server is running */
  isRunning: boolean;
  /** Whether the server is healthy (responding to health checks) */
  isHealthy: boolean;
  /** Process ID if running */
  pid?: number;
  /** Server URL if healthy */
  url?: string;
  /** Last error if any */
  lastError?: string;
  /** Startup timestamp */
  startedAt?: Date;
}

export interface HealthCheckResponse {
  server: string;
  timestamp: string;
  dependencies: Record<string, string>;
}

export interface McpServiceEvents {
  /** Server started successfully */
  started: [status: McpServerStatus];
  /** Server became healthy */
  healthy: [status: McpServerStatus];
  /** Server stopped */
  stopped: [reason: string];
  /** Server error occurred */
  error: [error: Error];
  /** Health check failed */
  unhealthy: [error: Error];
}

export interface StartupOptions {
  /** Wait for server to be healthy before resolving */
  waitForHealthy?: boolean;
  /** Additional environment variables */
  env?: Record<string, string>;
}
