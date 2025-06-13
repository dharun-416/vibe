/**
 * Centralized logging utility for Vibe
 */

export type LogLevel = "error" | "warn" | "info" | "debug";

export interface Logger {
  error(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

class VibeLogger implements Logger {
  private isDevelopment = process.env.NODE_ENV !== "production";

  error(message: string, ...args: any[]): void {
    console.error(`[ERROR] ${message}`, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`[WARN] ${message}`, ...args);
  }

  info(message: string, ...args: any[]): void {
    if (this.isDevelopment) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.isDevelopment) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }
}

export const logger = new VibeLogger();

export function createLogger(context: string): Logger {
  return {
    error: (message: string, ...args: any[]) =>
      logger.error(`[${context}] ${message}`, ...args),
    warn: (message: string, ...args: any[]) =>
      logger.warn(`[${context}] ${message}`, ...args),
    info: (message: string, ...args: any[]) =>
      logger.info(`[${context}] ${message}`, ...args),
    debug: (message: string, ...args: any[]) =>
      logger.debug(`[${context}] ${message}`, ...args),
  };
}
