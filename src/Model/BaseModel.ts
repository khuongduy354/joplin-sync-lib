// Model type constants matching Joplin's BaseModel exactly
export enum ModelType {
  Note = 1,
  Folder = 2,
  Setting = 3,
  Resource = 4,
  Tag = 5,
  NoteTag = 6,
  Search = 7,
  Alarm = 8,
  MasterKey = 9,
  ItemChange = 10,
  NoteResource = 11,
  ResourceLocalState = 12,
  Revision = 13,
  Migration = 14,
  SmartFilter = 15,
  Command = 16,
}

// Type constants for backward compatibility
export const TYPE_NOTE = ModelType.Note;
export const TYPE_FOLDER = ModelType.Folder;
export const TYPE_SETTING = ModelType.Setting;
export const TYPE_RESOURCE = ModelType.Resource;
export const TYPE_TAG = ModelType.Tag;
export const TYPE_NOTE_TAG = ModelType.NoteTag;
export const TYPE_SEARCH = ModelType.Search;
export const TYPE_ALARM = ModelType.Alarm;
export const TYPE_MASTER_KEY = ModelType.MasterKey;
export const TYPE_ITEM_CHANGE = ModelType.ItemChange;
export const TYPE_NOTE_RESOURCE = ModelType.NoteResource;
export const TYPE_RESOURCE_LOCAL_STATE = ModelType.ResourceLocalState;
export const TYPE_REVISION = ModelType.Revision;
export const TYPE_MIGRATION = ModelType.Migration;
export const TYPE_SMART_FILTER = ModelType.SmartFilter;
export const TYPE_COMMAND = ModelType.Command;

export interface BaseItemData {
  id?: string;
  type_: ModelType;
  created_time?: number;
  updated_time?: number;
  user_created_time?: number;
  user_updated_time?: number;
  encryption_applied?: number;
  encryption_cipher_text?: string;
  title?: string;
}

export abstract class BaseModel {
  static TYPE_NOTE = TYPE_NOTE;
  static TYPE_FOLDER = TYPE_FOLDER;
  static TYPE_SETTING = TYPE_SETTING;
  static TYPE_RESOURCE = TYPE_RESOURCE;
  static TYPE_TAG = TYPE_TAG;
  static TYPE_NOTE_TAG = TYPE_NOTE_TAG;
  static TYPE_SEARCH = TYPE_SEARCH;
  static TYPE_ALARM = TYPE_ALARM;
  static TYPE_MASTER_KEY = TYPE_MASTER_KEY;
  static TYPE_ITEM_CHANGE = TYPE_ITEM_CHANGE;
  static TYPE_NOTE_RESOURCE = TYPE_NOTE_RESOURCE;
  static TYPE_RESOURCE_LOCAL_STATE = TYPE_RESOURCE_LOCAL_STATE;
  static TYPE_REVISION = TYPE_REVISION;
  static TYPE_MIGRATION = TYPE_MIGRATION;
  static TYPE_SMART_FILTER = TYPE_SMART_FILTER;
  static TYPE_COMMAND = TYPE_COMMAND;

  public id: string;
  public type_: ModelType;
  public created_time?: number;
  public updated_time?: number;
  public user_created_time?: number;
  public user_updated_time?: number;
  public encryption_applied?: number;
  public encryption_cipher_text?: string;
  public title?: string;

  constructor(data: BaseItemData) {
    this.id = data.id || "";
    this.type_ = data.type_;
    this.created_time = data.created_time;
    this.updated_time = data.updated_time;
    this.user_created_time = data.user_created_time;
    this.user_updated_time = data.user_updated_time;
    this.encryption_applied = data.encryption_applied;
    this.encryption_cipher_text = data.encryption_cipher_text;
    this.title = data.title;
  }

  abstract getFieldNames(): string[];
}

export default BaseModel;
