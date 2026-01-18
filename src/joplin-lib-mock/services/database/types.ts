import { ModelType } from "../../BaseModel";

export interface BaseItemEntity {
  id?: string;
  encryption_applied?: number;
  is_shared?: number;
  share_id?: string;
  type_?: ModelType;
  updated_time?: number;
  created_time?: number;
}

export type SqlParams = any[];

export interface SqlQuery {
  sql: string;
  params?: SqlParams;
}

export type StringOrSqlQuery = string | SqlQuery;
export type Migration = () => (SqlQuery | string)[];

export enum FolderIconType {
  Emoji = 1,
  DataUrl = 2,
  FontAwesome = 3,
}

export interface FolderIcon {
  type: FolderIconType;
  emoji: string;
  name: string;
  dataUrl: string;
}

export const defaultFolderIcon = () => {
  const icon: FolderIcon = {
    type: FolderIconType.Emoji,
    emoji: "",
    name: "",
    dataUrl: "",
  };
  return icon;
};

export interface UserDataValue {
  v: any;
  t: Number;
  d?: Number;
}

export enum ResourceOcrStatus {
  Todo = 0,
  Processing = 1,
  Done = 2,
  Error = 3,
}

export type UserData = Record<string, Record<string, UserDataValue>>;

export interface AlarmEntity {
  id?: number | null;
  note_id?: string;
  trigger_time?: number;
  type_?: number;
}

export interface DeletedItemEntity {
  deleted_time?: number;
  id?: number | null;
  item_id?: string;
  item_type?: number;
  sync_target?: number;
  type_?: number;
}

export interface FolderEntity {
  created_time?: number;
  deleted_time?: number;
  encryption_applied?: number;
  encryption_cipher_text?: string;
  icon?: string;
  id?: string | null;
  is_shared?: number;
  master_key_id?: string;
  parent_id?: string;
  share_id?: string;
  title?: string;
  updated_time?: number;
  user_created_time?: number;
  user_data?: string;
  user_updated_time?: number;
  type_?: number;
}

export interface ItemChangeEntity {
  before_change_item?: string;
  created_time?: number;
  id?: number | null;
  item_id?: string;
  item_type?: number;
  source?: number;
  type?: number;
  type_?: number;
}

export interface NoteTagEntity {
  created_time?: number;
  encryption_applied?: number;
  encryption_cipher_text?: string;
  id?: string | null;
  is_shared?: number;
  note_id?: string;
  tag_id?: string;
  updated_time?: number;
  user_created_time?: number;
  user_updated_time?: number;
  type_?: number;
}

export interface NoteEntity {
  altitude?: number;
  application_data?: string;
  author?: string;
  body?: string;
  conflict_original_id?: string;
  created_time?: number;
  deleted_time?: number;
  encryption_applied?: number;
  encryption_cipher_text?: string;
  id?: string | null;
  is_conflict?: number;
  is_shared?: number;
  is_todo?: number;
  latitude?: number;
  longitude?: number;
  markup_language?: number;
  master_key_id?: string;
  order?: number;
  parent_id?: string;
  share_id?: string;
  source?: string;
  source_application?: string;
  source_url?: string;
  title?: string;
  todo_completed?: number;
  todo_due?: number;
  updated_time?: number;
  user_created_time?: number;
  user_data?: string;
  user_updated_time?: number;
  type_?: number;
}

export interface ResourceEntity {
  blob_updated_time?: number;
  created_time?: number;
  encryption_applied?: number;
  encryption_blob_encrypted?: number;
  encryption_cipher_text?: string;
  file_extension?: string;
  filename?: string;
  id?: string | null;
  is_shared?: number;
  master_key_id?: string;
  mime?: string;
  ocr_details?: string;
  ocr_error?: string;
  ocr_status?: number;
  ocr_text?: string;
  share_id?: string;
  size?: number;
  title?: string;
  updated_time?: number;
  user_created_time?: number;
  user_data?: string;
  user_updated_time?: number;
  type_?: number;
}

export interface TagEntity {
  created_time?: number;
  encryption_applied?: number;
  encryption_cipher_text?: string;
  id?: string | null;
  is_shared?: number;
  parent_id?: string;
  title?: string;
  updated_time?: number;
  user_created_time?: number;
  user_updated_time?: number;
  type_?: number;
}

export interface MasterKeyEntity {
  checksum?: string;
  content?: string;
  created_time?: number;
  encryption_method?: number;
  hasBeenUsed?: number;
  id?: string | null;
  source_application?: string;
  updated_time?: number;
  type_?: number;
}

export interface RevisionEntity {
  created_time?: number;
  encryption_applied?: number;
  id?: string | null;
  item_id?: string;
  item_type?: number;
  item_updated_time?: number;
  parent_id?: string;
  title_diff?: string;
  body_diff?: string;
  metadata_diff?: string;
  updated_time?: number;
  type_?: number;
}

export interface SyncItemEntity extends BaseItemEntity {
  sync_time?: number;
  sync_disabled?: number;
  sync_disabled_reason?: string;
}
