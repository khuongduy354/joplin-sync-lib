import BaseItem from "@joplin/lib/models/BaseItem";
import { initDb } from "./Database/Database";
import { FileSystemSyncTarget } from "./SyncTarget/FileSystemSyncTarget";
import Note from "@joplin/lib/models/Note";
import { serializeModel } from "./helpers/item";

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
    // const db = await initDb(localDBPath);
    const db: any = null;
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
    const item = noteBuilder();
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

function noteBuilder(title = "", body = "") {
  const sample = {
    id: "",
    parent_id: "1b0663e319074c0cbd966678dabde0b8",
    title,
    body,
    // TODO: create in upload process
    // created_time: "2024-05-20T10:59:36.204Z",
    // updated_time: "2024-05-20T10:59:37.322Z",
    // user_created_time: "2024-05-20T10:59:36.204Z",
    // user_updated_time: "2024-05-20T10:59:37.322Z",
    is_conflict: 0,
    latitude: 10.7578263,
    longitude: 106.7012968,
    altitude: 0.0,
    author: "",
    source_url: "",
    is_todo: 1,
    todo_due: 0,
    todo_completed: 0,
    // TODO: change to library
    source: "joplin-desktop",
    source_application: "net.cozic.joplin-desktop",
    application_data: "",
    order: 0,
    encryption_cipher_text: "",
    encryption_applied: 0,
    markup_language: 1,
    is_shared: 0,
    share_id: "",
    conflict_original_id: "",
    master_key_id: "",
    user_data: "",
    deleted_time: 0,
    type_: 1,
  };
  return sample;
}

async function mailClient() {
  try {
    // Upload an email to Joplin SyncTarget

    // 1. Create payload
    const mailTitle = "This is an email";
    const mailBody = "This is the body of the email, blahblahblah";
    const note = noteBuilder(mailTitle, mailBody); // note is a plain Javascript object { id, title, body, ...}

    // 2. Initialize Synchronizer

    const syncPath = "src/sample_app/Storage/fsSyncTarget"; // filesystem sync target

    const db: any = null; // upload dont need local database
    const syncTarget = new FileSystemSyncTarget(db);
    await syncTarget.initFileApi(syncPath);
    const syncer = await syncTarget.synchronizer();

    // 3. Upload email
    const res = await syncer.uploadItem({ items: [note] });
    console.log(res.createdIds); // return id of the newly created note
  } catch (err) {
    console.error(err);
  }
}
mailClient();
// main();
