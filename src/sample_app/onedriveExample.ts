// Example: Using OneDrive sync target with StorageAPI
import { StorageAPI } from "../StorageAPI/StorageAPI";

async function exampleOneDriveUsage() {
  // Example 1: Using pre-authenticated token (recommended)
  const storage = new StorageAPI("OneDrive", {
    oneDriveOptions: {
      // Auth token from OAuth flow (see docs/AUTHENTICATION.md)
      // authToken: process.env.ONEDRIVE_AUTH_TOKEN,
      clientId: process.env.ONEDRIVE_CLIENT_ID,
      clientSecret: process.env.ONEDRIVE_CLIENT_SECRET,
      // Optional: use custom client credentials
      // clientId: process.env.ONEDRIVE_CLIENT_ID,
      // clientSecret: process.env.ONEDRIVE_CLIENT_SECRET,
      // Optional: specify if this is a public client (default: true)
      // isPublic: true,
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
    console.error("Error:", error.message);

    if (error.message.includes("not authenticated")) {
      console.error("\n⚠️  Authentication failed. Please ensure you have:");
      console.error("1. Valid ONEDRIVE_AUTH_TOKEN in environment");
      console.error("2. Token has not expired");
      console.error(
        "3. Token has correct permissions (Files.ReadWrite.AppFolder)"
      );
      console.error("\nSee docs/AUTHENTICATION.md for OAuth setup guide");
    }
  }
}

// Example 2: Handling token refresh
async function exampleTokenRefresh() {
  const storage = new StorageAPI("OneDrive", {
    oneDriveOptions: {
      authToken: process.env.ONEDRIVE_AUTH_TOKEN,
    },
  });

  // Token refresh happens automatically
  // The authRefreshed event is emitted when token is refreshed
  // StorageAPI logs the new token - you should save it for future use

  await storage.init();

  console.log("✓ OneDrive connected");
  console.log("📝 If token is refreshed, check console for new token to save");

  // Use storage normally - token refresh is automatic
  const items = await storage.getItems();
  console.log(`Found ${items.length} items`);
}

// Run examples
if (require.main === module) {
  console.log("=== OneDrive Storage API Example ===\n");

  // Check if credentials are available
  if (!process.env.ONEDRIVE_AUTH_TOKEN) {
    console.error("⚠️  ONEDRIVE_AUTH_TOKEN not found in environment");
    console.error("Please set it in .env file or environment variables");
    console.error("See .env.example for template\n");
    process.exit(1);
  }

  exampleOneDriveUsage()
    .then(() => {
      console.log("\n✓ Example completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n✗ Example failed:", error);
      process.exit(1);
    });
}

export { exampleOneDriveUsage, exampleTokenRefresh };
