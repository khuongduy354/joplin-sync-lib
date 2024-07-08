import BaseItem from "@joplin/lib/models/BaseItem";
import { FileSystemSyncTarget } from "../SyncTarget/FileSystemSyncTarget";
import Note from "@joplin/lib/models/Note";
import { serializeModel, unserializeWithoutSQLite } from "./item";
import Resource from "@joplin/lib/models/Resource";
import { serializeForSync, setE2EEnabled } from "../E2E";

// Override some Joplin classes in order to function without SQLite
export function loadClasses() {
  Resource.fieldNames = (withPrefix: boolean = false) => {
    return [
      "id",
      "mime",
      "file_extension",
      "title",
      "filename",
      "created_time",
      "updated_time",
      "encryption_blob_encrypted",
      "encryption_applied",
      "size",
      "share_id",
      "is_shared",
      "blob_updated_time",
      "ocr_text",
      "ocr_status",
      "ocr_details",
      "ocr_error",
      "encryption_cipher_text",
    ];
  };
  Note.fieldNames = (withPrefix: boolean = false) => {
    return [
      "id",
      "title",
      "body",
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
  // override some classes
  BaseItem.serialize = serializeModel;
  BaseItem.serializeForSync = serializeForSync;
  BaseItem.unserialize = unserializeWithoutSQLite;

  BaseItem.loadClass("Note", Note);
  BaseItem.loadClass("Resource", Resource);
}

// BELOW is driver code for some use cases
async function getItemsMetadata() {
  const syncPath = "src/sample_app/Storage/fsSyncTarget"; // filesystem sync target
  const syncTarget = new FileSystemSyncTarget(null);
  await syncTarget.initFileApi(syncPath);
  const syncer = await syncTarget.synchronizer();

  const res = await syncer.getItemsMetadata();
  console.log("Result: ", res);
}
