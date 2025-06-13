# @vibe/tab-extraction-core

This library provides core functionality for extracting content and metadata from browser tabs using the Chrome DevTools Protocol (CDP). It's designed for use in Node.js environments, including Electron main processes and backend servers.

Example usage:

```ts
import { CDPConnector, getCurrentPageContent } from "@vibe/tab-extraction-core";

async function main() {
  // Initialize the CDPConnector, typically pointing to a browser instance
  // started with a remote debugging port (e.g., --remote-debugging-port=9223)
  const cdpConnector = new CDPConnector('localhost', 9223);

  // Define the target tab, e.g., by its URL
  const targetUrl = "https://github.com/co-browser/vibe";
  // Alternatively, if you have the cdpTargetId:
  // const cdpTargetId = "E3A48F....";


  try {
    // Get a summary of the page content
    const summary = await getCurrentPageContent(
      {
        url: targetUrl, // or cdpTargetId: targetId
        format: 'summary',
      },
      cdpConnector
    );
    console.log("Page Summary:", summary.content[0].text);

    // More detailed extraction options are available via getCurrentPageContent,
    // extractSpecificContent, and getPageActions functions.

  } catch (error) {
    console.error("Error extracting content:", error);
  } finally {
    // It's good practice to disconnect all connections when done,
    // especially if the cdpConnector instance is long-lived.
    // For short-lived scripts, individual connections are often auto-managed.
    await cdpConnector.disconnectAll();
  }
}

main();
```

See `apps/electron-app` for usage within an Electron main process. Built with `chrome-remote-interface`.