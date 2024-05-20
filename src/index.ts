import BaseItem from "@joplin/lib/models/BaseItem";
import { initDb } from "./Database/Database";
import { FileSystemSyncTarget } from "./SyncTarget/FileSystemSyncTarget";
import Note from "@joplin/lib/models/Note";
import { serializeModel } from "./helpers";

// TODO: quick hack
Note.fieldNames = (withPrefix: boolean = false) => {
  return ["id", "title", "body"];
};

BaseItem.serialize = serializeModel;

BaseItem.loadClass("Note", Note);
async function main() {
  // path to sqlite database file
  const localDBPath = "src/sample_app/Storage/local.sqlite";
  const syncPath = "src/sample_app/Storage/fsSyncTarget";
  try {
    const db = await initDb(localDBPath);
    const syncTarget = new FileSystemSyncTarget(db);
    await syncTarget.initFileApi(syncPath);
    syncTarget.initSynchronizer();

    // test cases
    // 1. create new item
    // 5. pull created item

    // 2. update item with conflict
    // 4. pull updated item

    // 3. update item without conflict

    const itemClass = BaseItem.itemClass(1);
    const item = new itemClass();
    item.type_ = 1;
    (await syncTarget.synchronizer()).uploadItem({
      items: [item],
    });
    // syncTarget.synchronizer().then((syncer) => syncer.start());
  } catch (e) {
    console.log(e);
  }
}

console.log("Starting app...");
main();
