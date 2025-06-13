# @vibe/mcp-service

Professional MCP Server Service Wrapper for Vibe Workspace.

## Overview

This package provides a Node.js service wrapper for the Python MCP (Model Context Protocol) server, enabling seamless integration within the Vibe monorepo. It handles process lifecycle, health monitoring, and provides a clean API for service management.

## Features

- **Process Management**: Robust spawning and lifecycle management of Python MCP server
- **Health Monitoring**: Continuous health checking with retry logic and error handling
- **Event-Driven Architecture**: Subscribe to service events for monitoring and logging
- **Graceful Shutdown**: Proper cleanup and shutdown procedures
- **Professional Logging**: Structured logging with Winston
- **TypeScript Support**: Full type safety and excellent developer experience

## Architecture

```
┌─────────────────────────────────────────┐
│            @vibe/mcp-service            │
├─────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────────┐   │
│  │ McpService  │  │ ProcessManager  │   │
│  │             │  │                 │   │
│  │ - start()   │  │ - spawn uv      │   │
│  │ - stop()    │  │ - monitor       │   │
│  │ - health()  │  │ - cleanup       │   │
│  └─────────────┘  └─────────────────┘   │
│  ┌─────────────────────────────────────┐ │
│  │        HealthChecker               │ │
│  │ - HTTP health checks               │ │
│  │ - Retry logic                      │ │
│  │ - Continuous monitoring            │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
                     │
                     ▼
    ┌─────────────────────────────────────┐
    │     Python MCP Server (uv)         │
    │   apps/mcp-server/vibe-memory-rag   │
    │                                     │
    │ - FastMCP server                    │
    │ - Memory + RAG capabilities         │
    │ - Health check endpoint             │
    └─────────────────────────────────────┘
```

## Usage

### Basic Usage

```typescript
import { createMcpService } from '@vibe/mcp-service';

// Create service instance
const service = createMcpService({
  port: 8052,
  projectPath: './apps/mcp-server/vibe-memory-rag'
});

// Start service and wait for health
await service.start({ waitForHealthy: true });

// Use the service...

// Graceful shutdown
await service.stop();
```

### Event Monitoring

```typescript
service.on('started', (status) => {
  console.log('Service started', status);
});

service.on('healthy', (status) => {
  console.log('Service is healthy', status.url);
});

service.on('error', (error) => {
  console.error('Service error:', error);
});
```

### Health Checking

```typescript
// Manual health check
const { healthy, data, error } = await service.checkHealth();

// Wait for health
const isHealthy = await service.waitForHealthy(30000);
```

## Configuration

The service accepts the following configuration options:

```typescript
interface McpServerConfig {
  pythonPath?: string;          // Default: 'uv'
  projectPath: string;          // Path to Python project
  port: number;                 // Server port
  host?: string;                // Default: 'localhost'
  env?: Record<string, string>; // Environment variables
  startupTimeout?: number;      // Default: 30000ms
  healthCheckInterval?: number; // Default: 5000ms
}
```

## Integration with Turbo

This package is designed to work seamlessly with Turbo:

```json
{
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  }
}
```

In `turbo.json`:

```json
{
  "pipeline": {
    "dev": {
      "dependsOn": ["^dev"],
      "persistent": true
    }
  }
}
```

## Environment Variables

Required:
- `OPENAI_API_KEY`: OpenAI API key for the MCP server

Optional:
- `LOG_LEVEL`: Logging level (default: 'info')
- `MCP_SERVER_PORT`: Override default port
- `NODE_ENV`: Environment mode

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build
pnpm build

# Type check
pnpm typecheck
```

## Error Handling

The service provides comprehensive error handling:

- **Startup Errors**: Timeout handling, validation errors
- **Runtime Errors**: Process crashes, health check failures
- **Shutdown Errors**: Graceful cleanup with force-kill fallback

## Logging

Professional logging with Winston:

- Structured logs with timestamps
- Multiple log levels (error, warn, info, debug)
- Service identification in all log messages
- Production-ready file logging support

## License

Private - Vibe Workspace