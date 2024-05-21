import BaseItem from "@joplin/lib/models/BaseItem";
import { initDb } from "./Database/Database";
import { FileSystemSyncTarget } from "./SyncTarget/FileSystemSyncTarget";
import Note from "@joplin/lib/models/Note";
import { serializeModel } from "./helpers/item";
import { testNoteItem } from "./helpers/item";

// TODO: quick hack
Note.fieldNames = (withPrefix: boolean = false) => {
  return [
    "id",
    "title",
    "body",
    // TODO: fix time here
    "created_time",
    "updated_time",
    "user_updated_time",
    "user_created_time",
    "encryption_cipher_text",
    "encryption_applied",
    "markup_language",
    "is_shared",
    "source",
    "source_application",
    "application_data",
    "order",
    "latitude",
    "longitude",
    "altitude",
    "author",
    "source_url",
    "is_todo",
    "todo_due",
    "todo_completed",
    "is_conflict",
    "user_data",
    "deleted_time",
    "type_",
    "parent_id",
    "is_conflict",
    "share_id",
    "conflict_original_id",
    "master_key_id",
  ];
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

    // cases
    // 1. create new item DONE
    // 5. pull created item  doable without conflict (since new item = new ids) DONE

    // 3. update item without conflict

    // 2. update item with conflict
    // 4. pull updated item

    // 1. READ all items
    // 2. READ items since last sync

    // test cases on Lock: run 2 push at same time
    const item = testNoteItem();
    const res = await (
      await syncTarget.synchronizer()
    ).uploadItem({
      items: [item],
    });
    console.log(res);
    // syncTarget.synchronizer().then((syncer) => syncer.start());
  } catch (e) {
    console.log(e);
  }
}

console.log("Starting app...");
main();
