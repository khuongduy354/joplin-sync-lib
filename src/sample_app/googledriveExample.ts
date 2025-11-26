// Example: Using GoogleDrive sync target with StorageAPI
import { StorageAPI } from "../StorageAPI/StorageAPI";

async function exampleGoogleDriveUsage() {
  // Example 1: Using pre-authenticated token (recommended)
  const storage = new StorageAPI("GoogleDrive", {
    googleDriveOptions: {
      // Auth token from OAuth flow (see docs/AUTHENTICATION.md)
      authToken: process.env.GOOGLEDRIVE_AUTH_TOKEN,
      // Optional: use custom client credentials
      // clientId: process.env.GOOGLEDRIVE_CLIENT_ID,
      // clientSecret: process.env.GOOGLEDRIVE_CLIENT_SECRET,
      // Optional: specify if this is a public client (default: true)
      // isPublic: true,
    },
    // Optional: enable read-only mode
    readOnly: true,
  });

  try {
    // Initialize connection
    console.log("Initializing Google Drive sync...");
    await storage.init();
    console.log("✓ Google Drive initialized successfully");

    // Fetch all items
    console.log("\nFetching items from Google Drive...");
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

    // Test read-only mode
    if (storage.isReadOnly()) {
      console.log("\n✓ Storage is in read-only mode");
      console.log("Write operations are disabled");
    }
  } catch (error) {
    console.error("Error:", error.message);

    if (error.message.includes("not authenticated")) {
      console.error("\n⚠️  Authentication failed. Please ensure you have:");
      console.error("1. Valid GOOGLEDRIVE_AUTH_TOKEN in environment");
      console.error("2. Token has not expired");
      console.error("3. Token has correct permissions (drive.appdata scope)");
      console.error("\nSee docs/AUTHENTICATION.md for OAuth setup guide");
    }
  }
}

// Example 2: Handling token refresh
async function exampleTokenRefresh() {
  const storage = new StorageAPI("GoogleDrive", {
    googleDriveOptions: {
      authToken: process.env.GOOGLEDRIVE_AUTH_TOKEN,
    },
  });

  // Token refresh happens automatically
  // The authRefreshed event is emitted when token is refreshed
  // StorageAPI logs the new token - you should save it for future use

  await storage.init();

  console.log("✓ Google Drive connected");
  console.log("📝 If token is refreshed, check console for new token to save");

  // Use storage normally - token refresh is automatic
  const items = await storage.getItems();
  console.log(`Found ${items.length} items`);
}

// Example 3: Comparing OneDrive and GoogleDrive
async function exampleMultipleProviders() {
  console.log("=== Comparing Cloud Providers ===\n");

  // OneDrive
  const oneDriveStorage = new StorageAPI("OneDrive", {
    oneDriveOptions: {
      authToken: process.env.ONEDRIVE_AUTH_TOKEN,
    },
    readOnly: true,
  });

  // GoogleDrive
  const googleDriveStorage = new StorageAPI("GoogleDrive", {
    googleDriveOptions: {
      authToken: process.env.GOOGLEDRIVE_AUTH_TOKEN,
    },
    readOnly: true,
  });

  try {
    await oneDriveStorage.init();
    const oneDriveItems = await oneDriveStorage.getItems();
    console.log(`OneDrive: ${oneDriveItems.length} items`);
  } catch (error) {
    console.log(`OneDrive: Error - ${error.message}`);
  }

  try {
    await googleDriveStorage.init();
    const googleDriveItems = await googleDriveStorage.getItems();
    console.log(`Google Drive: ${googleDriveItems.length} items`);
  } catch (error) {
    console.log(`Google Drive: Error - ${error.message}`);
  }
}

// Run examples
if (require.main === module) {
  console.log("=== Google Drive Storage API Example ===\n");

  // Check if credentials are available
  if (!process.env.GOOGLEDRIVE_AUTH_TOKEN) {
    console.error("⚠️  GOOGLEDRIVE_AUTH_TOKEN not found in environment");
    console.error("Please set it in .env file or environment variables");
    console.error("See .env.example for template\n");
    process.exit(1);
  }

  exampleGoogleDriveUsage()
    .then(() => {
      console.log("\n✓ Example completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n✗ Example failed:", error);
      process.exit(1);
    });
}

export {
  exampleGoogleDriveUsage,
  exampleTokenRefresh,
  exampleMultipleProviders,
};
