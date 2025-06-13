import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import fs from "fs";
import path from "path";
import http from "http";
import { ipcRenderer } from "electron";
import os from "os";
import { createLogger } from "@vibe/shared-types";

const logger = createLogger("GmailService");

/**
 * Gmail OAuth Service
 *
 * Handles Gmail authentication and API integration
 */

// Configuration paths
const CONFIG_DIR = path.join(os.homedir(), ".vibe-gmail");
const OAUTH_PATH =
  process.env.GMAIL_OAUTH_PATH || path.join(CONFIG_DIR, "gcp-oauth.keys.json");
const CREDENTIALS_PATH =
  process.env.GMAIL_CREDENTIALS_PATH ||
  path.join(CONFIG_DIR, "credentials.json");

export interface GmailAuthStatus {
  isAuthenticated: boolean;
  hasOAuthKeys: boolean;
  hasCredentials: boolean;
  error?: string;
}

export interface GmailOAuthKeys {
  client_id: string;
  client_secret: string;
  redirect_uris: string[];
}

export class GmailOAuthService {
  private oauth2Client: OAuth2Client | null = null;
  private server: http.Server | null = null;

  constructor() {
    this.ensureConfigDir();
  }

  /**
   * Ensure config directory exists
   */
  private ensureConfigDir(): void {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
  }

  /**
   * Check current authentication status
   */
  async checkAuth(): Promise<GmailAuthStatus> {
    try {
      const hasOAuthKeys = fs.existsSync(OAUTH_PATH);
      const hasCredentials = fs.existsSync(CREDENTIALS_PATH);

      if (!hasOAuthKeys) {
        return {
          isAuthenticated: false,
          hasOAuthKeys: false,
          hasCredentials: false,
          error:
            "OAuth keys not found. Please place gcp-oauth.keys.json in config directory.",
        };
      }

      if (!hasCredentials) {
        return {
          isAuthenticated: false,
          hasOAuthKeys: true,
          hasCredentials: false,
          error: "Not authenticated. Please run authentication flow.",
        };
      }

      // Try to initialize OAuth client
      await this.initializeOAuthClient();

      // Test if credentials are valid
      if (!this.oauth2Client) {
        throw new Error("OAuth client not available");
      }
      const gmail = google.gmail({ version: "v1", auth: this.oauth2Client });
      await gmail.users.getProfile({ userId: "me" });

      return {
        isAuthenticated: true,
        hasOAuthKeys: true,
        hasCredentials: true,
      };
    } catch (error) {
      logger.error("[GmailAuth] Auth check failed:", error);
      return {
        isAuthenticated: false,
        hasOAuthKeys: fs.existsSync(OAUTH_PATH),
        hasCredentials: fs.existsSync(CREDENTIALS_PATH),
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Initialize OAuth2 client
   */
  private async initializeOAuthClient(): Promise<void> {
    if (!fs.existsSync(OAUTH_PATH)) {
      throw new Error(`OAuth keys file not found, checked: ${OAUTH_PATH}`);
    }

    const keysContent = JSON.parse(fs.readFileSync(OAUTH_PATH, "utf8"));
    const keys = keysContent.installed || keysContent.web;

    if (!keys) {
      throw new Error(
        'Invalid OAuth keys file format. File should contain either "installed" or "web" credentials.',
      );
    }

    this.oauth2Client = new OAuth2Client(
      keys.client_id,
      keys.client_secret,
      "http://localhost:3000/oauth2callback",
    );

    // Load existing credentials if available
    if (fs.existsSync(CREDENTIALS_PATH)) {
      const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));
      this.oauth2Client.setCredentials(credentials);
    }
  }

  /**
   * Start authentication flow
   */
  async startAuth(): Promise<{
    success: boolean;
    authUrl?: string;
    error?: string;
  }> {
    try {
      await this.initializeOAuthClient();

      if (!this.oauth2Client) {
        throw new Error("OAuth client not initialized");
      }

      // Generate auth URL
      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: ["https://www.googleapis.com/auth/gmail.modify"],
      });

      // Start local server for callback
      await this.startCallbackServer();

      // Open auth URL in default browser
      // shell.openExternal(authUrl);
      ipcRenderer.send("create-tab", authUrl);

      return {
        success: true,
        authUrl,
      };
    } catch (error) {
      logger.error("[GmailAuth] Auth start failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Start callback server for OAuth flow
   */
  private async startCallbackServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer();

      this.server.listen(3000, () => {
        logger.debug("[GmailAuth] Callback server started on port 3000");
        resolve();
      });

      this.server.on("request", async (req, res) => {
        if (!req.url?.startsWith("/oauth2callback")) return;

        const url = new URL(req.url, "http://localhost:3000");
        const code = url.searchParams.get("code");

        if (!code) {
          res.writeHead(400);
          res.end("No authorization code provided");
          this.stopCallbackServer();
          return;
        }

        try {
          if (!this.oauth2Client) {
            throw new Error("OAuth client not initialized");
          }

          const { tokens } = await this.oauth2Client.getToken(code);
          this.oauth2Client.setCredentials(tokens);

          // Save credentials
          fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(tokens, null, 2));

          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(`
            <html>
              <body style="font-family: system-ui; text-align: center; padding: 50px;">
                <h2>✅ Authentication Successful!</h2>
                <p>You can now close this window and return to the app.</p>
                <script>setTimeout(() => window.close(), 2000);</script>
              </body>
            </html>
          `);

          logger.debug("[GmailAuth] Authentication completed successfully");
          this.stopCallbackServer();
        } catch (error) {
          logger.error("[GmailAuth] Token exchange failed:", error);
          res.writeHead(500);
          res.end("Authentication failed");
          this.stopCallbackServer();
        }
      });

      this.server.on("error", error => {
        logger.error("[GmailAuth] Server error:", error);
        reject(error);
      });
    });
  }

  /**
   * Stop callback server
   */
  private stopCallbackServer(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
      logger.debug("[GmailAuth] Callback server stopped");
    }
  }

  /**
   * Clear stored credentials
   */
  async clearAuth(): Promise<{ success: boolean; error?: string }> {
    try {
      // Stop any running server
      this.stopCallbackServer();

      // Clear OAuth client
      this.oauth2Client = null;

      // Remove stored credentials
      if (fs.existsSync(CREDENTIALS_PATH)) {
        fs.unlinkSync(CREDENTIALS_PATH);
      }

      logger.debug("[GmailAuth] Authentication cleared");
      return { success: true };
    } catch (error) {
      logger.error("[GmailAuth] Clear auth failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get authenticated Gmail API client
   */
  async getGmailClient(): Promise<any> {
    if (!this.oauth2Client) {
      await this.initializeOAuthClient();
    }

    if (!this.oauth2Client) {
      throw new Error("OAuth client not initialized");
    }

    return google.gmail({ version: "v1", auth: this.oauth2Client });
  }

  /**
   * Get OAuth2 client for other services
   */
  getOAuth2Client(): OAuth2Client | null {
    return this.oauth2Client;
  }
}

// Export singleton instance
export const gmailOAuthService = new GmailOAuthService();
