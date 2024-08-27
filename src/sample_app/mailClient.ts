import { FileSystemSyncTarget } from "../SyncTarget/FileSystemSyncTarget";
import { createResource } from "../helpers/item";

function noteBuilder(title = "", body = "") {
  const sample = {
    id: "",
    parent_id: "1b0663e319074c0cbd966678dabde0b8",
    title,
    body,
    // these will be generated during create process
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
    source: "joplin-sync-api",
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
export async function mailClient(withAttachment = false) {
  try {
    // Upload an email to Joplin SyncTarget

    // 1. Create payload
    const mailTitle = "This is an email";
    const mailBody = "This is the body of the email, blahblahblah ![image](:/)";
    const note = noteBuilder(mailTitle, mailBody); // note is a plain Javascript object { id, title, body, ...}
    const items: any[] = [note];
    if (withAttachment) {
      let localResourceContentPath =
        "./src/sample_app/Storage/resource/image.png";
      const attachment = createResource({ localResourceContentPath });
      items.push(attachment);
    }

    // 2. Initialize Synchronizer

    const syncPath = "src/sample_app/Storage/fsSyncTarget"; // filesystem sync target

    const db: any = null; // upload dont need local database
    const syncTarget = new FileSystemSyncTarget(db);
    await syncTarget.initFileApi(syncPath);
    const syncer = await syncTarget.synchronizer();

    // 3. Upload email
    const res = await syncer.createItems({ items });
  } catch (err) {
    console.error(err);
  }
}
