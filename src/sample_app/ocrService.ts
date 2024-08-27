import { FileSystemSyncTarget } from "../SyncTarget/FileSystemSyncTarget";
import {
  ResourceEntity,
  ResourceOcrStatus,
} from "@joplin/lib/services/database/types";
import Synchronizer from "../Synchronizer/Synchronizer";
import { createResource } from "../helpers/item";
import { Item } from "../types/item";

async function createSampleResourceOnRemote(syncer: Synchronizer) {
  try {
    let localResourceContentPath =
      "./src/sample_app/Storage/resource/image.png";
    const res = await syncer.createItems({
      items: [createResource({ localResourceContentPath })],
    });
    return res.createdItems[0];
  } catch (e) {
    console.error("Failed to create resource: ", e);
  }
}

async function cleanUp(syncer: Synchronizer, resourceId: string) {
  const res = await syncer.deleteItems({
    deleteItems: [
      {
        id: resourceId,
        type_: 4,
      },
    ],
  });
  if (res[0].status !== "succeeded")
    return console.error("Failed to delete, please cleanup manually");
  console.log("Resource cleanup successfully");
}
// Retrieve a resource, process OCR, and update the resource
export async function OCRService() {
  // setup
  const syncPath = "src/sample_app/Storage/fsSyncTarget"; // filesystem sync target
  const db: any = null;
  const syncTarget = new FileSystemSyncTarget(db);
  await syncTarget.initFileApi(syncPath);
  const syncer = await syncTarget.synchronizer();

  const resourceId = (await createSampleResourceOnRemote(syncer)).id;

  // retrieve the resource
  const resource = (await syncer.getItem({
    id: resourceId,
    unserializeItem: true,
  })) as Item;
  if (resource.type_ !== 4) return console.log("Not a resource, skipping");
  console.log("\n\n");
  console.log("Resource before OCR: \n", resource);

  // update resource
  const toSave: ResourceEntity = {
    id: resourceId,
    type_: 4,
  };
  toSave.ocr_status = ResourceOcrStatus.Done;
  toSave.ocr_text = "Processed ocr text"; // result.text;
  toSave.ocr_details = "Processed ocr details"; // result.details;
  toSave.ocr_error = "";

  const updateResult = await syncer.updateItem({
    //@ts-ignore
    item: toSave,
    lastSync: resource.updated_time, // only update if lastSync parameter exactly match resource.updated_time
  });

  // update results
  if (updateResult.status === "succeeded") {
    console.log("OCR updated successfully: ");
    const newResource = await syncer.getItem({
      id: resourceId,
      unserializeItem: true,
    });
    console.log(newResource);
  } else {
    console.log("Update conflicted, try again with the correct timestamp");
  }

  await cleanUp(syncer, resourceId);
}
