import { StorageAPI } from "../StorageAPI/StorageAPI";
import * as readline from "readline";
import "dotenv/config";

// How to run:
// in root:
// npx tsnd --respawn --transpile-only src/bin/test_oneDrive_flow.ts
//  npx tsnd src/bin/test_oneDrive_flow.ts

// OAuth flow handler for CLI
async function cliOAuthHandler(authUrl: string): Promise<string> {
  console.log("\n" + "=".repeat(70));
  console.log("ONEDRIVE AUTHENTICATION REQUIRED");
  console.log("=".repeat(70));
  console.log("\n1. Visit this URL in your browser:");
  console.log("\x1b[36m%s\x1b[0m", authUrl);
  console.log("2. Sign in and grant permissions");
  console.log('3. After redirect, copy the "code" parameter from the URL');
  console.log(
    "   Example: https://login.microsoftonline.com/common/oauth2/nativeclient?code=YOUR_CODE_HERE"
  );
  console.log("\n" + "=".repeat(70) + "\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    rl.question("Paste the authorization code: ", (code) => {
      rl.close();
      const trimmed = code.trim();
      if (!trimmed) {
        reject(new Error("No code provided"));
      } else {
        console.log("\n✓ Code received, completing authentication...\n");
        resolve(trimmed);
      }
    });
  });
}

async function exampleOneDriveUsage() {
  // Check what credentials are available
  const hasAuthToken = !!process.env.ONEDRIVE_AUTH_TOKEN;
  const hasCredentials = !!(
    process.env.ONEDRIVE_CLIENT_ID && process.env.ONEDRIVE_CLIENT_SECRET
  );

  console.log("OneDrive Authentication Status:");
  console.log("  Auth Token:", hasAuthToken ? "✓ Found" : "✗ Not found");
  console.log(
    "  Client Credentials:",
    hasCredentials ? "✓ Found" : "✗ Not found"
  );
  console.log("");

  if (!hasAuthToken && !hasCredentials) {
    console.error("ERROR: No authentication credentials available!");
    console.error("\nPlease provide either:");
    console.error("  1. ONEDRIVE_AUTH_TOKEN environment variable, OR");
    console.error("  2. Both ONEDRIVE_CLIENT_ID and ONEDRIVE_CLIENT_SECRET");
    console.error("\nSee docs/AUTHENTICATION.md for setup instructions.\n");
    process.exit(1);
  }

  const storage = new StorageAPI("OneDrive", {
    oneDriveOptions: {
      // Use auth token if available
      authToken: process.env.ONEDRIVE_AUTH_TOKEN,
      // Otherwise use client credentials with OAuth handler
      clientId: process.env.ONEDRIVE_CLIENT_ID,
      clientSecret: process.env.ONEDRIVE_CLIENT_SECRET,
      // Provide OAuth handler for interactive authentication
      oauthFlowHandler: hasAuthToken ? undefined : cliOAuthHandler,
    },
  });

  try {
    // Initialize connection
    console.log("Initializing OneDrive sync...");
    await storage.init();
    console.log("✓ OneDrive initialized successfully");

    // Fetch all items
    console.log("\nFetching items from OneDrive...");
    const items = await storage.getItems();
    console.log(`✓ Found ${items.length} items`);

    // Display first few items
    if (items.length > 0) {
      console.log("\nFirst 3 items:");
      items.slice(0, 3).forEach((item: any, index: number) => {
        console.log(`${index + 1}. ${item.title || item.id} (${item.type_})`);
      });
    }

    // Fetch specific items by ID
    if (items.length > 0) {
      const firstItem = items[0];
      console.log(`\nFetching item details for: ${firstItem.id}`);
      const detailedItems = await storage.getItems({
        ids: [firstItem.id],
        unserializeAll: true,
      });
      console.log("Item details:", detailedItems[0]);
    }
  } catch (error) {
    console.error("\n" + "=".repeat(70));
    console.error("ERROR:", error.message);
    console.error("=".repeat(70) + "\n");

    if (error.message.includes("authentication required")) {
      console.error("Authentication credentials are required.");
      console.error("\nPlease provide one of the following:");
      console.error("  • ONEDRIVE_AUTH_TOKEN environment variable");
      console.error("  • Both ONEDRIVE_CLIENT_ID and ONEDRIVE_CLIENT_SECRET");
    } else if (error.message.includes("not authenticated")) {
      console.error("Authentication failed. Possible causes:");
      console.error("  • Token has expired");
      console.error("  • Invalid credentials");
      console.error("  • Missing permissions (Files.ReadWrite.AppFolder)");
    } else if (error.message.includes("OAuth flow")) {
      console.error("OAuth authentication process failed.");
      console.error("Please try again or use a pre-authenticated token.");
    }

    console.error("\nFor detailed setup instructions, see:");
    console.error("  docs/AUTHENTICATION.md");
    console.error("  docs/OAUTH_FLOW.md\n");

    process.exit(1);
  }
}

// Run the example
exampleOneDriveUsage().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
