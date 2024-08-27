# Sync API Demos  
# How to run demos  

- in src/index.ts 
``` js 
import { loadClasses } from "./helpers/item";
import { mailClient } from "./sample_app/mailClient";
import { newItemListernerDemo } from "./sample_app/newItemListener";
import { OCRService } from "./sample_app/ocrService";

async function main() {
  loadClasses(); // this must be run on top

  // then pick one of the demos below
  mailClient(true) 

  // or  
  await newItemListenerDemo() 

  // or 
  await OCRService()
}

main();
```

## Mail Client demo 
- This demo upload a note directly to sync target, also it can upload an image (which include blob+metadata files). 
- If set to true, after the operations finished, there should be 3 files in `src/sample_app/Storage/fsSyncTarget`: 1 note file, 1 image (resource) metadata file + 1 blob in .resource folder
```js
mailClient(false) //uploads note only 
mailClient(true) //uploads with image
``` 
> Expected result: If false, 1 file (note) is created. If true, 3 files are created: 1 note 1 blob 1 blob metadata.

## New Items listener demo 
- This demo will scan the sync target every X interval to look for new files. While the listener is running, uploads a new note and the listener can detect it. 
- The way it works is it has a timestamp Y (unix epoch), and `Synchronizer.getItemsMetadata()` allow getting items after Y (items at exactly Y are also retrieved). Therefore at the end of each scan, it sets Y to now, allowing the next scan to get the newest items. 
- For the first scan, we can set Y to 0, to get all items on sync target.  

> Expected result: while running, initially 0 items is detected, after a bit, 1 new item is created, and it should be detected

## OCRService 
- This is just a simple retrieve and update demo, in practice, we might need to combine item listener above.  
- First it create an initial resource, then retrieve it, change its OCR fields, and call `.updateItem()` to update the remote.
- After run, there should be a file in  `src/sample_app/Storage/fsSyncTarget/.resource`, its ocr fields (ocr_text) should contains the processed value
> Expected: It print the before update and after update to console, after update should have ocr fields processed.
