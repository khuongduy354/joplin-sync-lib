/**
 * Example: OneDrive OAuth Flow Handler for CLI Applications
 *
 * This example demonstrates how to implement a custom OAuth flow handler
 * for OneDrive authentication in a command-line application.
 *
 * Features:
 * - Automatic validation of authentication credentials
 * - Manual OAuth flow with user instructions
 * - Token storage for future use
 * - Error handling with clear feedback
 */

import { StorageAPI } from "../StorageAPI/StorageAPI";
import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";

// Token storage location
const TOKEN_FILE = path.join(__dirname, ".onedrive_token");

/**
 * OAuth flow handler for CLI applications
 * Opens the browser and waits for user to paste the authorization code
 */
async function cliOAuthFlowHandler(authUrl: string): Promise<string> {
  console.log(
    "\n╔════════════════════════════════════════════════════════════╗"
  );
  console.log("║       OneDrive Authentication Required                    ║");
  console.log(
    "╚════════════════════════════════════════════════════════════╝\n"
  );

  console.log("Step 1: Open the following URL in your browser:");
  console.log("\x1b[36m%s\x1b[0m\n", authUrl); // Cyan color

  console.log("Step 2: Sign in with your Microsoft account");
  console.log("Step 3: Grant permissions when prompted");
  console.log("Step 4: After authorization, you'll be redirected to:");
  console.log("        http://localhost:1917/?code=YOUR_AUTH_CODE\n");
  console.log('Step 5: Copy the "code" parameter from the URL\n');

  // Create readline interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    rl.question("Paste the authorization code here: ", (code) => {
      rl.close();

      const trimmedCode = code.trim();
      if (!trimmedCode) {
        reject(new Error("No authorization code provided"));
      } else {
        console.log("\n✓ Code received. Completing authentication...\n");
        resolve(trimmedCode);
      }
    });
  });
}

/**
 * Load stored auth token
 */
function loadStoredToken(): string | null {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      return fs.readFileSync(TOKEN_FILE, "utf-8");
    }
  } catch (error) {
    console.warn("Failed to load stored token:", error.message);
  }
  return null;
}

/**
 * Save auth token for future use
 */
function saveToken(token: string): void {
  try {
    fs.writeFileSync(TOKEN_FILE, token, "utf-8");
    console.log("✓ Auth token saved for future use\n");
  } catch (error) {
    console.error("Failed to save token:", error.message);
  }
}

/**
 * Main example function
 */
async function main() {
  console.log("OneDrive Storage API Example with OAuth Flow\n");
  console.log("═".repeat(60) + "\n");

  // Check for existing token
  let authToken = loadStoredToken();

  if (authToken) {
    console.log("✓ Found stored auth token\n");
  } else {
    console.log("ℹ No stored token found. OAuth flow will be initiated.\n");
  }

  // Initialize StorageAPI with OneDrive
  const storage = new StorageAPI("OneDrive", {
    oneDriveOptions: {
      // Option 1: Use stored token if available
      authToken: authToken,

      // Option 2: Provide OAuth credentials for first-time authentication
      clientId: process.env.ONEDRIVE_CLIENT_ID,
      clientSecret: process.env.ONEDRIVE_CLIENT_SECRET,

      // Custom OAuth flow handler
      oauthFlowHandler: cliOAuthFlowHandler,
    },
    readOnly: true, // Enable read-only mode for safety
  });

  try {
    console.log("Initializing OneDrive connection...");
    await storage.init();
    console.log("✓ Successfully connected to OneDrive\n");

    // Save token after successful authentication
    const currentToken = storage.getAuthToken();
    if (currentToken) {
      saveToken(currentToken);
    }

    // Listen for token refresh events
    storage.onAuthRefresh((authToken: string) => {
      console.log("ℹ Auth token refreshed");
      saveToken(authToken);
    });

    // Fetch items from OneDrive
    console.log("Fetching items from OneDrive...");
    const items = await storage.getItems();

    console.log(`\n✓ Found ${items.length} items\n`);

    // Display summary
    const notes = items.filter((item) => item.type_ === 1);
    const resources = items.filter((item) => item.type_ === 4);
    const folders = items.filter((item) => item.type_ === 2);

    console.log("Summary:");
    console.log(`  • Notes:     ${notes.length}`);
    console.log(`  • Resources: ${resources.length}`);
    console.log(`  • Folders:   ${folders.length}`);

    // Display first 5 note titles
    if (notes.length > 0) {
      console.log("\nRecent Notes:");
      notes.slice(0, 5).forEach((note, index) => {
        console.log(`  ${index + 1}. ${note.title || "(Untitled)"}`);
      });

      if (notes.length > 5) {
        console.log(`  ... and ${notes.length - 5} more`);
      }
    }

    console.log("\n" + "═".repeat(60));
    console.log("✓ Example completed successfully");
  } catch (error) {
    console.error("\n✗ Error:", error.message);

    // Provide helpful error messages
    if (error.message.includes("authentication required")) {
      console.error("\nTo fix this:");
      console.error("1. Set ONEDRIVE_CLIENT_ID environment variable");
      console.error("2. Set ONEDRIVE_CLIENT_SECRET environment variable");
      console.error("3. Or provide a valid authToken directly\n");
    }

    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

export { main, cliOAuthFlowHandler, loadStoredToken, saveToken };
