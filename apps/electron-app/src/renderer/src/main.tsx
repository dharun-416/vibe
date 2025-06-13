/**
 * Main entry point for the renderer process
 * Initializes the React application
 */

import "antd/dist/reset.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { init } from "@sentry/electron/renderer";
import App from "./App";

init({ debug: true });

// Create the root element and render the application
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
