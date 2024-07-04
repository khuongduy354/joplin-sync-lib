import OcrTesseractDriver from "@joplin/lib/services/ocr/drivers/OcrDriverTesseract";
import { FileSystemSyncTarget } from "../SyncTarget/FileSystemSyncTarget";
import { createWorker } from "tesseract.js";
import {
  ResourceEntity,
  ResourceOcrStatus,
} from "@joplin/lib/services/database/types";
import Resource from "@joplin/lib/models/Resource";
import filterOcrText from "@joplin/lib/services/ocr/utils/filterOcrText";
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
    console.log("Found new items: ", itemsStat.items);

    for (let item of itemsStat.items) {
      // is resource
      if (item.type_ !== 4) {
        console.log("Not a resource, skipping");
        continue;
      }
      let tries = 0;

      while (true) {
        if (tries >= 3) break;
        tries++;

        // mimicking download action
        const resourcePath = getResourcePath(syncPath, item.id);

        //init ocr
        const ocrTesseract = new OcrTesseractDriver({ createWorker });
        const result = await ocrTesseract.recognize("en", resourcePath);

        // update to new
        const toSave: ResourceEntity = {
          id: item.id,
        };

        toSave.ocr_status = ResourceOcrStatus.Done;
        toSave.ocr_text = filterOcrText(result.text);
        toSave.ocr_details = Resource.serializeOcrDetails(result.lines);
        toSave.ocr_error = "";

        // push to remote
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
          lastSync = updateResult.remoteItem?.updated_time;
          console.log("Update conflicted, try retrieveing a newer timestamp");
        }
      }
    }
  }, pollInterval * 1000);
}
