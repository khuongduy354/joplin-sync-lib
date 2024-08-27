# Joplin Sync Library    

Joplin Synchronization API documentation. 
 

# Run from source   
```js
git clone https://github.com/khuongduy354/joplin-sync-lib.git
npm install  

// Options to run: 
// 1. run in transpile mode (without build)
npm run dev   

// 2. build and run  
npm run build  
npm run start 

// src/index.ts is main driver code, 
// sync target is in src/sample_app/Storage/fsSyncTarget, check here for any changes 
``` 
see DEV.md for more explains 

# Getting started 
Before using Synchronizer methods, some setup steps is needed, make sure you run `npm install` at the root of this repo.  

There're some terms we'll be using: Synchronizer, Sync target, File API, drivers,... Checks the explanation here: https://joplinapp.org/help/dev/spec/sync/#vocabulary

Synchronizer is the main class that we'll focus on, as it contains all methods for syncing with the remote. To acquire a synchronizer instance, some setup steps are needed:  

0. Support Joplin's items

  To provide supports for Joplin's items, especially serialization, some of the classes methods need to be overriden, 3 types of supported items are Note, Resource, and Folder, to setup run loadClasses() once before any of synchronizer code. 

```ts
import { loadClasses } from "./helpers/item"; 
loadClasses() // place this at the topmost
```

1. Pick a sync target

Currently it only supports FileSystem and Memory. In the future JoplinServer, WebDav, OneDrive,... may be added. It takes a database instance as argument, currently it's not necessary so we'll set it to null.

```ts
const syncTarget = new FileSystemSyncTarget(null)
```

2. Init File API    

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
4. Initialize remote sync info 

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


# API  

> Main docs for Sync API users.
- To use this API, assuming that sync target is available (user setup and ran synchronize on joplin client at least once)    
- Assuming that the library supports only sync version 3 (latest sync version).
 
## Initialization 

```js
// 1. Pick a sync target 
// currently, database set to null as argument, in the future, we may inject a db instance
const syncTarget = new FileSystemSyncTarget(null);   

// 2. Init File API   
// depending on file api, it may be different, for e.g: filesystem file api need a path to a directory on the machine.
const syncPath = "src/sample_app/Storage/fsSyncTarget"; // filesystem sync target
await syncTarget.initFileApi(syncPath); 

// or, a MemorySyncTarget which doesn't need to provide anything   
// const syncTarget = new MemorySyncTarget(null);
await syncTarget.initFileApi();


// 3. Retrieve synchronizer 
// with the synchronizer we can perform operations directly to sync target
const syncer = await syncTarget.synchronizer();  

// 4. Initialize Sync target (creates info.json on remote)
await syncer.initSyncInfo();
```

## Synchronizer Operations   
After initializing Synchronizer from above steps, these methods are supported:

```ts  
// GET a single item from remote, 
// Provide either an id or a path of item
// unserializeItem option is default to false, if true will return item as an object, return as string otherwise
.getItem(getItemInput): getItemOutput
type getItemInput = {
  path?: string;
  id?: string;
  unserializeItem?: boolean;
};
type getItemOutput = string | null | Item;
 
// GET multiple items from remote 
// Similar to getItem, provide a list of ids (paths are not supported), unserializeAll === true will return items as an array of object, return an array of string otherwise
.getItems(getItemsInput): getItemsOutput  
type getItemsInput = {
  ids: string[];
  unserializeAll?: boolean;
};
type getItemsOutput = Item[];


// GET items metadata from remote  
// context.timetamp return items after specified timestamp (inclusive), this is useful for delta, or detecting new items. 
// outputLimit is default to 50, will retrieve a maximum of X items, if there're more items needed retrieving, the output contains a hasMore flag and a timestamp to fetch more.
.getItemsMetadata(getItemsMetadataInput): getItemsMetadataOutput 
type getItemsMetadataInput = {
  context: {
    timestamp?: number; //in unixMs, retrieve items with .updated_time field after timestamp (inclusive)
  };
  outputLimit?: number; // default to 50 
};

type getItemsMetadataOutput = {
  items: Item[];
  hasMore: boolean; 
  context: {
    timestamp: number; // use to fetch more, or keep track of next fetch for delta
  };
};

// UPDATE an item  
// To avoid conflict, this method only allow updating an item if its .updated_time field on remote is matched exactly with lastSync parameter. 
.updateItem(updateItemInput): updateItemOutput
type updateItemInput = {
  item: Item; 
  lastSync: number; // timestamp in unixMs
};
type updateItemOutput = {
  // conflicted means the client timestamp is older than remote, which means another client has updated and this client hasn't pull the changes yet.
  // inaccurate timestamp means the client timestamp is newer than remote, which shouldn't be possible, because lastSync timestamp should be updated whenever both sides sync, the client can't independent sync, and has newer timestamp than remote. This is a result of wrongly tracked timestamp on client.  
  // succeeded means the lastSync arguments exactly equal item.updated_time on remote, and the item will be updated, it will return a newSyncTime, which client should keep track and use as lastSync argument for next update.
  status: "conflicted" | "inaccurate timestamp" | "succeeded";
  message: string;

  // return when conflicted, use this to resolve conflict
  remoteItem?: Item;

  //  return when success
  newItem?: Item;
  oldItem?: Item;
  newSyncTime?: number; // updated timestamp
};

// CREATE multiple items on remote 
// The provided items should at least have .type_ field, if it's a resource (type_ == 4), then provide a path to the resource
// Items ids will be generated automatically during creation regardless of input contains id or not, this prevent the client to provide an already available id and cause conflict.
.createItems(createItemsInput): createItemsOutput
type createItemsInput = {
  items: Item[]; 
};
type createItemsOutput = {
  createdItems: CreateItem[];
  failedItems: { item: any; error: any }[];
};

// DELETE multiple items 
// The provided items should at least have .type_ field and id, if it's a resource (type_ == 4), then this operation will find the blob and metadata, and delete both (2 delete API calls) for each item.
.deleteItems(deleteItemsInput): deleteItemsOutput
type deleteItemsInput = {
  deleteItems: Item[];
};
type deleteItemsOutput = {
  status:
    | "succeeded"
    | "item not found" // item with provided id not available on remote
    | "could not delete item" // unknown error 
    | "read-only item can't be deleted"; 
  item?: Item;
  error?: any;
};

// VERIFY sync info version and E2E settings on remote
// Run before every Sync operations, it will fetch remote sync info (info.json file) and make sure its sync version is 3 
// Then it will looks for remote E2E settings, and compare to the input E2E settings and prompts approriate actions client has to do to resolve conflicts (if happens), see E2E docs.
.verifySyncInfo(verifySyncInfoInput): verifySyncInfoOutput
type verifySyncInfoInput = {
  E2E: {
    ppk?: PublicPrivateKeyPair;
    e2ee: boolean;
  };
};

type verifySynInfoOutput = {
  status: "success" | "aborted";
  message: string;
  remoteSyncInfo?: any; // for debug
};
```

## Encryption

### Setup E2E for Synchronizer  
 
- Synchronizer.e2eInfo stores encryption setup data, this decides whether CREATE, UPDATE methods will encrypt before upload.

```ts
type e2eInfo = {
  ppk?: PublicPrivateKeyPair; 
  e2ee: boolean; // encryption enable or not
  activeMasterKeyId?: string; 
};

type PublicPrivateKeyPair = {
  id: string;
  keySize: number;
  publicKey: string;
  privateKey: {
    encryptionMethod: EncryptionMethod; 
    ciphertext: string;
  };
  createdTime: number;
}
```    

- Users (clients) cant use Sync Library to enable/disable remote E2E because to do so, it requires proper re-encrypt and reupload data, this reduces data corruption. 
- To enable E2E, the process is as follow:   
1. Enable E2E in 1 Joplin app, provide password and all necessary data, click Synchronise and make sure Synchronisation succeeds, instruction:  [Joplin enabling e2ee](https://joplinapp.org/help/apps/sync/e2ee/#enabling-e2ee)  
2. In Sync library, fetch the remote sync info and extract all necessary E2E data:  

```ts  
const remoteSyncInfo = fetchSyncInfo(synchronizer.api());   
const localE2EInfo = extractE2EInfoFromSyncInfo(remoteSyncInfo) 
``` 

3. Run Synchronizer.setupE2E(localE2EInfo):  
```ts
const res: setupE2EOutput = synchronizer.setupE2E(localE2EInfo) 

type setupE2EOutput = {
  status: "succeeded" | "aborted";
  message: string; 
  remoteInfo?: SyncInfo; 
  e2eInfo?: e2eInfo; // returned when e2eInfo is set successfully  
}; 
```

4. If res.status is succeeded, then E2E is synced properly between client and remote. Most of the aborted cases are either users forgot to provide localE2EInfo (no E2E setup) or remote's e2e has changed since last time, the fix is to repeat from step 2 again. 

- To disable E2E, use 1 Joplin app to disable E2E, from step 2 and on, do the same as process above 
- When Synchronizer E2E is enabled, CREATE and UPDATE operations will encrypt items automatically for each call (no extra parameters required). 

### How E2E is applied if enabled
 - Only 2 Synchronizer operations: CREATE and UPDATE can apply encryption, which uses the ItemUploader class, it will take the E2E input from Synchronizer and perform encryption accordingly.
 - For READ methods, client may need extra code to decrypt content with master key, because results return from Sync API will be encrypted string.

