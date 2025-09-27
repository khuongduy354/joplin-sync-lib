import { Item } from "../../types/item";
import { ModelType } from "../../Model";
import { ItemFactory, createUUID } from "./itemBuilders";

// Model field name registry for easy access
export const MODEL_FIELD_NAMES = {
  [ModelType.Note]: [
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
    "share_id",
    "conflict_original_id",
    "master_key_id",
  ],
  [ModelType.Resource]: [
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
    "type_",
    "master_key_id",
  ],
  [ModelType.Folder]: [
    "id",
    "title",
    "created_time",
    "updated_time",
    "user_updated_time",
    "user_created_time",
    "encryption_cipher_text",
    "encryption_applied",
    "parent_id",
    "master_key_id",
    "icon",
    "user_data",
    "deleted_time",
    "type_",
  ],
  [ModelType.Tag]: [
    "id",
    "title",
    "created_time",
    "updated_time",
    "user_updated_time",
    "user_created_time",
    "encryption_cipher_text",
    "encryption_applied",
    "user_data",
    "deleted_time",
    "type_",
    "master_key_id",
  ],
};

// Legacy compatibility functions - keeping the old interface
export type createResourceInput = {
  localResourceContentPath: string;
  title?: string;
  body?: string;
};

export const createResource = (i: createResourceInput): Item => {
  const builder = ItemFactory.createResource().setLocalResourceContentPath(
    i.localResourceContentPath
  );

  if (i.title) builder.setTitle(i.title);

  return builder.build();
};

export function createNote(i: {
  parent_id: string;
  title?: string;
  body?: string;
}): Item {
  const builder = ItemFactory.createNote().setParentId(i.parent_id);

  if (i.title) builder.setTitle(i.title);
  if (i.body) builder.setBody(i.body);

  return builder.build();
}

export function createFolder(i: { title?: string; parent_id?: string }): Item {
  const builder = ItemFactory.createFolder().setTitle(
    i.title || "Untitled Folder"
  );

  if (i.parent_id) builder.setParentId(i.parent_id);

  return builder.build();
}

export function createTag(i: { title: string }): Item {
  return ItemFactory.createTag().setTitle(i.title).build();
}

function createBasicItem(type_: number): Item {
  return {
    id: createUUID(),
    type_,
  };
}

// Export for backward compatibility
export { createBasicItem };
