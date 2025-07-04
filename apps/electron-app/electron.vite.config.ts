import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin({ exclude: ["@modelcontextprotocol/sdk"] }),
      sentryVitePlugin({
        authToken: "some invalid auth token",
        org: "some invalid org",
        project: "some invalid project",
        telemetry: false,
        sourcemaps: {
          assets: [],
        },
        release: {
          inject: false,
        },
        errorHandler() {
          // do nothing on errors :)
          // They will happen because of the invalid auth token
        },
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src/main"),
        "~": path.resolve(__dirname, "./src/shared"),
      },
    },
    build: {
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, "./src/main/index.ts"),
          "processes/agent-process": path.resolve(__dirname, "./src/main/processes/agent-process.ts"),
        },
        output: {
          entryFileNames: "[name].js",
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        "~": path.resolve(__dirname, "./src/shared"),
      },
    },
  },
  renderer: {
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src/renderer/src"),
        "~": path.resolve(__dirname, "./src/shared"),
        "@vibe/shared-types": path.resolve(__dirname, "../../packages/shared-types/src/index.ts"),
      },
    },
    server: {
      port: 5173,
      host: 'localhost',
      strictPort: true,
    },
    plugins: [
      react(),
      sentryVitePlugin({
        authToken: "some invalid auth token",
        org: "some invalid org",
        project: "some invalid project",
        telemetry: false,
        sourcemaps: {
          assets: [],
        },
        release: {
          inject: false,
        },
        errorHandler() {
          // do nothing on errors :)
          // They will happen because of the invalid auth token
        },
      }),
    ],
  },
});
