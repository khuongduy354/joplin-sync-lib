import BaseModel, { BaseItemData, ModelType } from "./BaseModel";

export interface FolderData extends BaseItemData {
  parent_id?: string;
  icon?: string;
  user_data?: string;
  deleted_time?: number;
  master_key_id?: string;
}

export class Folder extends BaseModel {
  public parent_id?: string;
  public icon?: string;
  public user_data?: string;
  public deleted_time?: number;
  public master_key_id?: string;

  constructor(data: FolderData) {
    super({ ...data, type_: ModelType.Folder });

    this.parent_id = data.parent_id;
    this.icon = data.icon;
    this.user_data = data.user_data;
    this.deleted_time = data.deleted_time;
    this.master_key_id = data.master_key_id;
  }

  getFieldNames(): string[] {
    return [
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
    ];
  }
}

export default Folder;
