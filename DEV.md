# Commands 
- npm run dev: run src/index.ts (transpile mode)
- npm run test: jest --silent (run all test cases)  


# Files structure  
- src/index.ts : entry file when running `npm run dev`
- src/helpers/main_helper.ts : mainly loadClasses() use for overriding default methods in Joplin, must be run before using Sync API. (see src/index.ts and \*.test files)
- src/sample_app/ : example code for how to use the sync API   


# How to use Sync API  

```js 

import { loadClasses } from "./helpers/main_helper"; 

// run this before everything else
loadClasses()  

// create item, there're 2 ways 
// 1. bare js object 
  note = { 
    type_: 1, 
    title: "title", 
    body: "body"
  } 

// 2. noteBuilder (in helpers module) 
  note = noteBuilder("title", "body")   

// Initialize sync target and synchronizer   
  // init sync target
  const db = null // currently doesn't need local database to function
  const syncTarget = new FileSystemSyncTarget(db); 

  // init File API 
  const syncPath = "src/sample_app/Storage/fsSyncTarget"; // filesystem sync target (relative path is allowed)
  await syncTarget.initFileApi(syncPath);

  // init synchronizer
  const syncer = await syncTarget.synchronizer();


// Usage 
const res = await syncer.createItems({items: [note]})    // res.createdIds contains ids of new items  


const timestamp = time.IsoToUnixMs("ISO time string here") // time is in helpers module
const res = await syncer.getItemsMetadata({ context: { timestamp: timestamp } })    // return items metadata newer than timestamp, timestamp default to 0 (get all items metadata)  

syncer.getItem({id: "item id", unserializeItem: false}) // get 1 single item, unserializeItem will determine if result is in JS object or string



```

