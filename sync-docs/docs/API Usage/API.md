# Joplin Sync API docs
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
  }; outputLimit?: number; // default to 50 
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

