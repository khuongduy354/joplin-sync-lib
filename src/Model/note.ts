import BaseModel, { BaseItemData, ModelType } from "./BaseModel";

export interface NoteData extends BaseItemData {
  body?: string;
  parent_id: string;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  author?: string;
  source_url?: string;
  is_todo?: number;
  todo_due?: number;
  todo_completed?: number;
  is_conflict?: number;
  markup_language?: number;
  is_shared?: number;
  source?: string;
  source_application?: string;
  application_data?: string;
  order?: number;
  user_data?: string;
  deleted_time?: number;
  share_id?: string;
  conflict_original_id?: string;
  master_key_id?: string;
}

export class Note extends BaseModel {
  public body: string;
  public parent_id: string;
  public latitude?: number;
  public longitude?: number;
  public altitude?: number;
  public author?: string;
  public source_url?: string;
  public is_todo?: number;
  public todo_due?: number;
  public todo_completed?: number;
  public is_conflict?: number;
  public markup_language?: number;
  public is_shared?: number;
  public source?: string;
  public source_application?: string;
  public application_data?: string;
  public order?: number;
  public user_data?: string;
  public deleted_time?: number;
  public share_id?: string;
  public conflict_original_id?: string;
  public master_key_id?: string;

  constructor(data: NoteData) {
    super({ ...data, type_: ModelType.Note });

    this.body = data.body || "";
    this.parent_id = data.parent_id;
    this.latitude = data.latitude;
    this.longitude = data.longitude;
    this.altitude = data.altitude;
    this.author = data.author;
    this.source_url = data.source_url;
    this.is_todo = data.is_todo;
    this.todo_due = data.todo_due;
    this.todo_completed = data.todo_completed;
    this.is_conflict = data.is_conflict;
    this.markup_language = data.markup_language;
    this.is_shared = data.is_shared;
    this.source = data.source;
    this.source_application = data.source_application;
    this.application_data = data.application_data;
    this.order = data.order;
    this.user_data = data.user_data;
    this.deleted_time = data.deleted_time;
    this.share_id = data.share_id;
    this.conflict_original_id = data.conflict_original_id;
    this.master_key_id = data.master_key_id;
  }

  getFieldNames(): string[] {
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
      "share_id",
      "conflict_original_id",
      "master_key_id",
    ];
  }
}

export default Note;
