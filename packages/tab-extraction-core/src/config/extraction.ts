import { z } from "zod";

// Define the configuration schema
const ExtractionConfigSchema = z.object({
  limits: z
    .object({
      maxImages: z.number().positive().default(100),
      maxLinks: z.number().positive().default(200),
      maxActions: z.number().positive().default(50),
      maxTextLength: z.number().positive().default(1000000), // 1MB of text
      maxExtractionTime: z.number().positive().default(30000), // 30 seconds
    })
    .default({}),
  readability: z
    .object({
      charThreshold: z.number().default(500),
      enableDebug: z.boolean().default(false),
    })
    .default({}),
  cdp: z
    .object({
      connectionTimeout: z.number().default(30 * 60 * 1000), // 30 minutes
      poolSize: z.number().positive().default(10),
      idleTimeout: z.number().default(5 * 60 * 1000), // 5 minutes
      retryOptions: z
        .object({
          maxRetries: z.number().positive().default(5),
          initialDelay: z.number().positive().default(1000),
          maxDelay: z.number().positive().default(30000),
          backoffFactor: z.number().positive().default(2),
        })
        .default({}),
    })
    .default({}),
  performance: z
    .object({
      enableCaching: z.boolean().default(true),
      cacheMaxAge: z.number().default(5 * 60 * 1000), // 5 minutes
      enableMetrics: z.boolean().default(process.env.NODE_ENV === "production"),
    })
    .default({}),
});

export type ExtractionConfig = z.infer<typeof ExtractionConfigSchema>;

// Load configuration from environment variables
const loadConfigFromEnv = (): Record<string, any> => {
  const config: Record<string, any> = {};

  // Limits
  if (process.env.EXTRACT_MAX_IMAGES) {
    config.limits = config.limits || {};
    config.limits.maxImages = parseInt(process.env.EXTRACT_MAX_IMAGES);
  }
  if (process.env.EXTRACT_MAX_LINKS) {
    config.limits = config.limits || {};
    config.limits.maxLinks = parseInt(process.env.EXTRACT_MAX_LINKS);
  }
  if (process.env.EXTRACT_MAX_ACTIONS) {
    config.limits = config.limits || {};
    config.limits.maxActions = parseInt(process.env.EXTRACT_MAX_ACTIONS);
  }
  if (process.env.EXTRACT_MAX_TEXT_LENGTH) {
    config.limits = config.limits || {};
    config.limits.maxTextLength = parseInt(process.env.EXTRACT_MAX_TEXT_LENGTH);
  }
  if (process.env.EXTRACT_MAX_TIME) {
    config.limits = config.limits || {};
    config.limits.maxExtractionTime = parseInt(process.env.EXTRACT_MAX_TIME);
  }

  // Readability
  if (process.env.READABILITY_CHAR_THRESHOLD) {
    config.readability = config.readability || {};
    config.readability.charThreshold = parseInt(
      process.env.READABILITY_CHAR_THRESHOLD,
    );
  }
  if (process.env.READABILITY_DEBUG) {
    config.readability = config.readability || {};
    config.readability.enableDebug = process.env.READABILITY_DEBUG === "true";
  }

  // CDP
  if (process.env.CDP_CONNECTION_TIMEOUT) {
    config.cdp = config.cdp || {};
    config.cdp.connectionTimeout = parseInt(process.env.CDP_CONNECTION_TIMEOUT);
  }
  if (process.env.CDP_POOL_SIZE) {
    config.cdp = config.cdp || {};
    config.cdp.poolSize = parseInt(process.env.CDP_POOL_SIZE);
  }
  if (process.env.CDP_IDLE_TIMEOUT) {
    config.cdp = config.cdp || {};
    config.cdp.idleTimeout = parseInt(process.env.CDP_IDLE_TIMEOUT);
  }

  // CDP Retry Options
  if (
    process.env.CDP_MAX_RETRIES ||
    process.env.CDP_INITIAL_DELAY ||
    process.env.CDP_MAX_DELAY ||
    process.env.CDP_BACKOFF_FACTOR
  ) {
    config.cdp = config.cdp || {};
    config.cdp.retryOptions = {};

    if (process.env.CDP_MAX_RETRIES) {
      config.cdp.retryOptions.maxRetries = parseInt(
        process.env.CDP_MAX_RETRIES,
      );
    }
    if (process.env.CDP_INITIAL_DELAY) {
      config.cdp.retryOptions.initialDelay = parseInt(
        process.env.CDP_INITIAL_DELAY,
      );
    }
    if (process.env.CDP_MAX_DELAY) {
      config.cdp.retryOptions.maxDelay = parseInt(process.env.CDP_MAX_DELAY);
    }
    if (process.env.CDP_BACKOFF_FACTOR) {
      config.cdp.retryOptions.backoffFactor = parseFloat(
        process.env.CDP_BACKOFF_FACTOR,
      );
    }
  }

  // Performance
  if (process.env.ENABLE_CACHING !== undefined) {
    config.performance = config.performance || {};
    config.performance.enableCaching = process.env.ENABLE_CACHING !== "false";
  }
  if (process.env.CACHE_MAX_AGE) {
    config.performance = config.performance || {};
    config.performance.cacheMaxAge = parseInt(process.env.CACHE_MAX_AGE);
  }
  if (process.env.ENABLE_METRICS !== undefined) {
    config.performance = config.performance || {};
    config.performance.enableMetrics = process.env.ENABLE_METRICS === "true";
  }

  return config;
};

// Deep merge function
const deepMerge = (target: any, source: any): any => {
  const output = Object.assign({}, target);
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
};

const isObject = (item: any): item is Record<string, any> => {
  return item && typeof item === "object" && !Array.isArray(item);
};

// Create and export the configuration
export const extractionConfig: ExtractionConfig = (() => {
  const envConfig = loadConfigFromEnv();
  const defaultConfig = ExtractionConfigSchema.parse({});

  // Deep merge env config with defaults
  const mergedConfig = deepMerge(defaultConfig, envConfig);

  return ExtractionConfigSchema.parse(mergedConfig);
})();

// Export a function to get current config (useful for runtime updates)
export const getConfig = () => extractionConfig;

// Export a function to validate custom config
export const validateConfig = (config: unknown) => {
  return ExtractionConfigSchema.safeParse(config);
};
