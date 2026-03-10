# Development
# Commands 
- npm run dev: run src/index.ts (transpile mode)
- npm run test: jest --silent (run all test cases)  


# Files structure  
- src/index.ts : entry file when running `npm run dev`
- src/helpers/item.ts : providing methods to override, default Joplin Item models, all overriding takes place in loadClasses(), which is called before every sync initialization
- src/sample_app/ : example code for how to use the sync API   


# How to use Sync API

`StorageAPI` is the recommended way to interact with sync targets. It wraps the lower-level `Synchronizer` and handles initialization automatically.

```ts
import { StorageAPI, createNote } from "joplin-sync-lib";

// Initialize (lazy — init() is called automatically on first operation)
const storage = new StorageAPI("FileSystem", {
  filesystemOptions: { syncPath: "src/sample_app/Storage/fsSyncTarget" },
});

// Create items
const note = createNote({ title: "My Note", body: "Hello!" });
const res = await storage.createItem(note);
// res.createdItems contains the created items

// Get all items
const items = await storage.getItems();

// Get specific items by ID
const items = await storage.getItems({ ids: ["item-id-1", "item-id-2"] });

// Get items as deserialized objects
const items = await storage.getItems({ unserializeAll: true });
```

For lower-level access (delta, conflict resolution, etc.), use `Synchronizer` directly — see [API.md](../API\ Usage/API.md).
