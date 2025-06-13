import pino from "pino";

// Determine environment
const isDevelopment = process.env.NODE_ENV !== "production";
const isElectron =
  typeof process !== "undefined" &&
  process.versions &&
  process.versions.electron;

// Get log level from environment or default based on NODE_ENV
const getLogLevel = (): string => {
  if (process.env.LOG_LEVEL) {
    return process.env.LOG_LEVEL.toLowerCase();
  }
  return isDevelopment ? "debug" : "info";
};

// Define custom log levels if needed
const customLevels = {
  error: 50,
  warn: 40,
  info: 30,
  debug: 20,
  trace: 10,
  verbose: 15, // Custom level between trace and debug
};

// Create base logger options
const baseOptions: pino.LoggerOptions = {
  level: getLogLevel(),
  customLevels,
  // In production, use faster serializers
  serializers: isDevelopment
    ? pino.stdSerializers
    : {
        err: pino.stdSerializers.err,
        // Minimize other serialization in production
      },
  // Add base properties
  base: {
    env: process.env.NODE_ENV || "development",
    ...(isDevelopment ? { pid: process.pid } : {}),
  },
};

// Create transport options for development (but not in Electron)
const devTransport =
  isDevelopment && !isElectron
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss",
          ignore: "pid,hostname",
          // Show different levels with different colors
          customColors:
            "error:red,warn:yellow,info:green,debug:blue,verbose:magenta",
          // Only show method and stack traces in development
          errorLikeObjectKeys: ["err", "error"],
        },
      }
    : undefined;

// Create the base logger
export const logger = pino({
  ...baseOptions,
  transport: devTransport,
  // Redact sensitive information in production
  redact: isDevelopment
    ? []
    : ["password", "token", "auth", "authorization", "cookie", "secret"],
});

// Export function to create child logger with component name
export function createLogger(component: string) {
  const childLogger = logger.child({ component });

  // Add helper methods for conditional logging
  (childLogger as any).verbose = function (msg: string, ...args: any[]) {
    if (isDevelopment) {
      this.debug(msg, ...args);
    }
  };

  (childLogger as any).devOnly = function (
    level: string,
    msg: string,
    ...args: any[]
  ) {
    if (isDevelopment) {
      this[level](msg, ...args);
    }
  };

  return childLogger;
}

// Export helper to update log level at runtime
export const setLogLevel = (level: string) => {
  logger.level = level;
  logger.info(`Log level updated to: ${level}`);
};

// Export helper to get current log level info
export const getLogLevelInfo = () => ({
  current: logger.level,
  levelValue: logger.levelVal,
  isProduction: !isDevelopment,
  isElectron,
  available: Object.keys(customLevels),
  env: process.env.NODE_ENV,
});

// Export helper for structured logging in production
export const structuredLog = (
  level: string,
  message: string,
  metadata?: Record<string, any>,
) => {
  if (isDevelopment) {
    (logger as any)[level](metadata || {}, message);
  } else {
    // In production, always use structured format
    (logger as any)[level]({
      msg: message,
      ...metadata,
      timestamp: new Date().toISOString(),
    });
  }
};

// Silent logger for testing
export const silentLogger = pino({
  level: "silent",
});

export default logger;
