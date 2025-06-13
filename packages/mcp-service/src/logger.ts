/**
 * Professional logging configuration for MCP Service
 */
import winston from "winston";

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom format for development
const developmentFormat = printf(
  ({ level, message, timestamp, stack, service = "mcp-service" }) => {
    if (stack) {
      return `${timestamp} [${service}] ${level}: ${message}\n${stack}`;
    }
    return `${timestamp} [${service}] ${level}: ${message}`;
  },
);

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: combine(
    errors({ stack: true }),
    timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  ),
  defaultMeta: { service: "mcp-service" },
  transports: [
    // Console transport with colors for development
    new winston.transports.Console({
      format: combine(colorize({ all: true }), developmentFormat),
    }),
  ],
});

// Add file transport for production if needed
if (process.env.NODE_ENV === "production") {
  logger.add(
    new winston.transports.File({
      filename: "logs/mcp-service-error.log",
      level: "error",
      format: combine(timestamp(), winston.format.json()),
    }),
  );

  logger.add(
    new winston.transports.File({
      filename: "logs/mcp-service-combined.log",
      format: combine(timestamp(), winston.format.json()),
    }),
  );
}
