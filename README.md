# Joplin Storage API
> Previously called Joplin Sync Library

An SDK extracted from Joplin, providing a simple REST API-like interface for syncing notes across different storage providers.

Supported sync targets: `FileSystem`, `Memory`, `WebDAV`, `JoplinServer`, `OneDrive`, `GoogleDrive`

# Usage

## Quick Start

```ts
import { StorageAPI, createNote } from "joplin-sync-lib";

const storage = new StorageAPI("FileSystem", {
  filesystemOptions: { syncPath: "./my-sync-folder" },
});

const note = createNote({ title: "Hello", body: "World" });
const result = await storage.createItem(note);
console.log("Created:", result.createdItems);

const items = await storage.getItems();
console.log("All items:", items);
```

## Sync Targets

### WebDAV
```ts
const storage = new StorageAPI("WebDAV", {
  webDAVOptions: {
    username: "user@example.com",
    password: "password",
    path: "https://your-webdav-server/remote.php/dav/files/user",
    ignoreTlsErrors: false,
  },
});
```

### Joplin Server
```ts
const storage = new StorageAPI("JoplinServer", {
  joplinServerOptions: {
    username: "admin@localhost",
    password: "admin",
    path: "http://localhost:22300",
    userContentPath: "http://localhost:22300",
  },
});
```

### OneDrive
```ts
const storage = new StorageAPI("OneDrive", {
  oneDriveOptions: {
    clientId: "your-client-id",
    clientSecret: "your-client-secret",
    authToken: "previously-saved-token", // optional
    oauthFlowHandler: async (authUrl) => {
      // open authUrl in browser, return the redirect URL
      return "https://localhost/?code=...";
    },
  },
});

// Persist token across sessions
storage.onAuthRefresh((token) => {
  fs.writeFileSync("token.json", token);
});
```

### Read-Only Mode
```ts
const storage = new StorageAPI("FileSystem", {
  filesystemOptions: { syncPath: "./sync" },
  readOnly: true, // createItem/createItems will throw
});
```

## Run from source
```bash
git clone https://github.com/khuongduy354/joplin-sync-lib.git
npm install

# transpile mode (no build)
npm run dev

# build and run
npm run build
npm run start
```

# Documentations

All documentation is in [sync-docs/docs](./sync-docs/docs).

```bash
cd sync-docs/
npm run build
npm run start
```

