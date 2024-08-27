import { MemorySyncTarget } from "../SyncTarget/MemorySyncTarget";
import Synchronizer from "../Synchronizer/Synchronizer";
import time from "../helpers/time";

export async function newItemListernerDemo() {
  // setup
  const db: any = null;
  const syncTarget = new MemorySyncTarget(db);
  const fileApi = await syncTarget.initFileApi();
  const syncer = await syncTarget.synchronizer();
  await syncer.migrationHandler().initSyncInfo3();

  // listen to new items every 5 seconds
  newItemListener(syncer, 5 * 1000);

  // create an item after 10 seconds
  setTimeout(async () => {
    syncer.createItems({ items: [{ id: "any", type_: 1, title: "New item" }] });
  }, 10000);
}
async function newItemListener(syncer: Synchronizer, interval: number) {
  // unix timestamp
  let lastSync = 0; // retrieve all item initially
  let batchIdx = 0;
  let totalCount = 0;
  let isScanning = false;

  console.log("\n\n\n Listening for new items \n");
  setInterval(async () => {
    if (isScanning) return;
    isScanning = true;

    // scan for new items
    const res = await syncer.getItemsMetadata({
      context: {
        timestamp: lastSync,
      },
    });
    if (!res.items.length) {
      console.log("No new items found!!!");
    }

    totalCount += res.items.length;
    console.log(`Total items scanned so far: ${totalCount}`);
    console.log(`Batch ${batchIdx++}`);
    console.log("Items count ", res.items.length);
    console.log("\n\n");

    // update lastSync to now
    lastSync = time.unixMs();

    isScanning = false;
  }, interval);
}
