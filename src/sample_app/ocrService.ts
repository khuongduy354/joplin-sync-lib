import { FileSystemSyncTarget } from "../SyncTarget/FileSystemSyncTarget";
import {
  ResourceEntity,
  ResourceOcrStatus,
} from "@joplin/lib/services/database/types";
import time from "../helpers/time";

const getResourcePath = (syncPath: string, id: string) => {
  if (!syncPath.endsWith("/")) syncPath += "/";
  return syncPath + ".resource/" + id;
};

// Looking for new file uploaded, and ocr scan it if it's a resource
export async function OCRService() {
  // setup
  const syncPath = "src/sample_app/Storage/fsSyncTarget"; // filesystem sync target
  const db: any = null;
  const syncTarget = new FileSystemSyncTarget(db);
  await syncTarget.initFileApi(syncPath);
  const syncer = await syncTarget.synchronizer();

  const pollInterval = 5; //secs

  // initial scan for latest timestamp
  const itemsStat = await syncer.getItemsMetadata();
  if (itemsStat.items.length === 0) return console.log("No items found");

  let lastSync = 0;
  for (let item of itemsStat.items) {
    if (item.updated_time > lastSync) {
      lastSync = item.updated_time;
    }
  }

  console.log("Found item with latest sync time: ", time.unixMsToIso(lastSync));

  // polling
  setInterval(async () => {
    // retrieve items newer than last scan
    const itemsStat = await syncer.getItemsMetadata({
      context: { timestamp: lastSync },
    });
    if (!itemsStat.items.length) return console.log("No new items found");

    for (let itemStat of itemsStat.items) {
      let item = null;
      try {
        // quick check if item is resource
        item = await syncer.getItem({
          path: itemStat.path,
          unserializeItem: true,
        });
        // is resource
        if (item.type_ !== 4) {
          console.log("Not a resource, skipping");
          item = null;
          continue;
        }
      } catch (err) {
        // skip if error
        console.log(
          "Error processing item: ",
          err.message,
          ", Processing next item"
        );
        continue;
      }

      if (!item) continue;

      console.log("Is resource, Processing item: ", item.id);
      // mimicking download action
      // const resourcePath = getResourcePath(syncPath, item.id);

      //init ocr and scan
      // const ocr = new OCRService();
      // const result = await ocr.scan(resourcePath);

      // update to new
      const toSave: ResourceEntity = {
        id: item.id,
      };

      toSave.ocr_status = ResourceOcrStatus.Done;
      toSave.ocr_text = "Processed ocr text"; // result.text;
      toSave.ocr_details = "Processed ocr details"; // result.details;
      toSave.ocr_error = "";

      // push to remote
      try {
        const updateResult = await syncer.updateItem({
          item: toSave,
          lastSync,
        });
        if (updateResult.status === "success") {
          lastSync = updateResult.newSyncTime as number;
          console.log("OCR scanned: ", toSave);
          break;
        } else {
          // update to newer timestamp and retry
          lastSync = updateResult.newSyncTime as number;
          console.log("Update conflicted, try retrieveing a newer timestamp");
        }
      } catch (err) {
        console.log("Unknown error updating item: ", err.message);
      }
    }
  }, pollInterval * 1000);
}
