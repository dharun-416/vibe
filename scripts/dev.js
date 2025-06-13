#!/usr/bin/env node

const { spawn, execSync } = require("child_process");
const process = require("process");
const path = require("path");

// Load environment variables from root .env file
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

let mcpProcess;
let turboProcess;
const childProcesses = [];

// Function to cleanup processes
function cleanup() {
  console.log("\n🧹 Cleaning up processes...");

  // Kill any process using port 8052 (MCP server port)
  try {
    execSync("lsof -ti:8052 | xargs kill -9 2>/dev/null || true", { stdio: 'ignore' });
  } catch {
    // Port might not be in use
  }

  // Kill all child processes
  childProcesses.forEach((proc) => {
    if (proc && !proc.killed) {
      try {
        process.kill(-proc.pid, "SIGTERM");
      } catch {
        // Process might already be dead
      }
    }
  });

  // Kill turbo process and all its children
  if (turboProcess && !turboProcess.killed) {
    try {
      process.kill(-turboProcess.pid, "SIGTERM");
    } catch {
      // Process might already be dead
    }
  }

  // Kill MCP process
  if (mcpProcess && !mcpProcess.killed) {
    try {
      process.kill(-mcpProcess.pid, "SIGTERM");
    } catch {
      // Process might already be dead
    }
  }

  console.log("✅ Cleanup complete");
  process.exit(0);
}

// Handle various exit signals
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", cleanup);

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  cleanup();
});

// Wait for a port to be available
async function waitForPort(port, maxWaitMs = 30000) {
  const net = require("net");
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    try {
      await new Promise((resolve, reject) => {
        const socket = new net.Socket();
        socket.setTimeout(1000);
        socket.on("connect", () => {
          socket.destroy();
          resolve();
        });
        socket.on("timeout", () => {
          socket.destroy();
          reject(new Error("timeout"));
        });
        socket.on("error", () => {
          reject(new Error("connection failed"));
        });
        socket.connect(port, "localhost");
      });
      return true;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  return false;
}

async function main() {
  try {
    // Clean up any existing MCP server processes on port 8052
    console.log("🧹 Cleaning up any existing MCP server processes...");
    try {
      execSync("lsof -ti:8052 | xargs kill -9 2>/dev/null || true", { stdio: 'ignore' });
      await new Promise(resolve => setTimeout(resolve, 1000)); // Give processes time to clean up
    } catch {
      // Port might not be in use
    }
    console.log("✅ Port cleanup complete\n");

    // Build dependencies first
    console.log("📦 Building required dependencies...\n");
    execSync("turbo run build --filter=@vibe/tab-extraction-core --filter=@vibe/mcp-service", {
      stdio: "inherit",
    });
    console.log("✅ Dependencies built successfully\n");

    // Check if OPENAI_API_KEY is available
    if (!process.env.OPENAI_API_KEY) {
      console.log("⚠️  OPENAI_API_KEY not found - MCP service will not start");
      console.log("🚀 Starting other development servers...\n");
      
      // Start turbo dev without MCP service
      turboProcess = spawn("turbo", ["run", "dev", "--filter=!@vibe/mcp-service"], {
        stdio: "inherit",
        detached: true,
      });
      childProcesses.push(turboProcess);
    } else {
      // Start MCP service first
      console.log("🔧 Starting MCP service...\n");
      mcpProcess = spawn("pnpm", ["--filter", "@vibe/mcp-service", "dev"], {
        stdio: ["pipe", "inherit", "inherit"],
        detached: true,
        env: { ...process.env },
      });
      childProcesses.push(mcpProcess);

      // Wait for MCP service to be ready
      console.log("⏳ Waiting for MCP service to be ready...");
      const mcpReady = await waitForPort(8052, 60000);
      
      if (!mcpReady) {
        console.error("❌ MCP service failed to start within 60 seconds");
        console.log("🚀 Starting other development servers anyway...\n");
      } else {
        console.log("✅ MCP service is ready!\n");
      }

      // Start other development servers
      console.log("🚀 Starting other development servers...\n");
      turboProcess = spawn("turbo", ["run", "dev", "--filter=!@vibe/mcp-service"], {
        stdio: "inherit",
        detached: true,
      });
      childProcesses.push(turboProcess);
    }

    // Handle process events
    if (mcpProcess) {
      mcpProcess.on("error", (err) => {
        console.error("Failed to start MCP service:", err);
      });

      mcpProcess.on("exit", (code) => {
        if (code !== 0 && code !== null) {
          console.error(`MCP service exited with code ${code}`);
        }
      });
    }

    if (turboProcess) {
      turboProcess.on("error", (err) => {
        console.error("Failed to start turbo:", err);
        cleanup();
      });

      turboProcess.on("exit", (code) => {
        if (code !== 0 && code !== null) {
          console.error(`Turbo exited with code ${code}`);
        }
        cleanup();
      });
    }

    console.log("🎉 All services started! Press Ctrl+C to stop.\n");

  } catch (err) {
    console.error("❌ Failed to start development environment:", err.message);
    cleanup();
  }
}

main();