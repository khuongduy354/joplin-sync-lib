---
sidebar_position: 1
---

# Getting started 
Before using Synchronizer methods, some setup steps is needed, make sure you run `npm install` at the root of this repo.  

There're some terms we'll be using: Synchronizer, Sync target, File API, drivers,... Checks the explanation here: https://joplinapp.org/help/dev/spec/sync/#vocabulary

Synchronizer is the main class that we'll focus on, as it contains all methods for syncing with the remote. To acquire a synchronizer instance, some setup steps are needed:  

### Supported Joplin's items

  To provide supports for Joplin's items, especially serialization, some of the classes methods need to be overriden, 3 types of supported items are Note, Resource, and Folder, to setup run loadClasses() once before any of synchronizer code. 

```ts
import { loadClasses } from "./helpers/item"; 
loadClasses() // place this at the topmost
```

### Pick a sync target

Currently it only supports FileSystem and Memory. In the future JoplinServer, WebDav, OneDrive,... may be added. It takes a database instance as argument, currently it's not necessary so we'll set it to null.

```ts
const syncTarget = new FileSystemSyncTarget(null)
```

## Steps to setup
### Init File API    

File API provide methods to interact with storage system, our Synchronizer will need it in order to perform CRUD operations to files on remote.  

Currently, FileSystemSyncTarget requires a path points to the directory that function as a remote storage, and MemorySyncTarget requires no arguments.  

```ts
const syncPath = "src/sample_app/Storage/fsSyncTarget"; 
await syncTarget.initFileApi(syncPath); 
```
3. Initialize the synchronizer 

At this step we can initialize a synchronizer, it should we able to perform operations on syncTarget above
```ts
const syncer = await syncTarget.synchronizer();   
```   
### Initialize remote sync info 

It is recommended to create a remote from a Joplin client (Desktop for e.g) by completing the instructions when setup Syncing, and click Synchronise at least once, the remote will be initialized here.   

If it's not initialized by any other clients, run the below code
```ts
await syncer.initSyncInfo();
``` 

At this step your synchronizer is setup properly and you can use the Sync API.


```ts 

// The most basic things you can do is create items   

const note = createNote({ //helper to create note
      title: mailTitle,
      body: mailBody,
      parent_id: "asdas",
}); 

await syncer.createItems({items: [note]})  
  ``` 
After running the above code, check your remote storage, if you use the syncPath from example, then check directory: `src/sample_app/Storage/fsSyncTarget`, you should see a new markdown file created 

When working with resources, consider to have a localResourceContentPath field, it should be the relative path to the blob.
```ts
let localResourceContentPath = "./src/sample_app/Storage/resource/image.png";
const resource = createResource({ localResourceContentPath }); 

await syncer.createItems({items: [resource]})  
// create a resource will create 2 files: 1 metadata file (.md) and a blob 
```

Full code: 
```js
import { FileSystemSyncTarget } from '../SyncTarget/FileSystemSyncTarget';
import { loadClasses } from '../helpers/item';
import { createNote, createResource } from '../helpers/item';

async function main() {
  // 0. Load Joplin item classes for serialization support
  loadClasses();

  // 1. Create a sync target (FileSystem in this example)
  const syncTarget = new FileSystemSyncTarget(null);

  // 2. Initialize File API with a path for remote storage
  const syncPath = "src/sample_app/Storage/fsSyncTarget";
  await syncTarget.initFileApi(syncPath);

  // 3. Get synchronizer instance
  const syncer = await syncTarget.synchronizer();

  // 4. Initialize remote sync info (only needed if remote is not initialized by a Joplin client)
  await syncer.initSyncInfo();

  // Now you can use the synchronizer to create items

  // Create a note
  const note = createNote({
    title: "My First Note",
    body: "Hello from Joplin Sync Lib!",
    parent_id: "", // Root folder
  });
  await syncer.createItems({ items: [note] });

  // Create a resource (like an image)
  const localResourceContentPath = "./src/sample_app/Storage/resource/image.png";
  const resource = createResource({ localResourceContentPath });
  await syncer.createItems({ items: [resource] });
}

main().catch(console.error);
```

