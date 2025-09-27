import BaseModel, { BaseItemData, ModelType } from "./BaseModel";

export interface TagData extends BaseItemData {
  user_data?: string;
  deleted_time?: number;
  master_key_id?: string;
}

export class Tag extends BaseModel {
  public user_data?: string;
  public deleted_time?: number;
  public master_key_id?: string;

  constructor(data: TagData) {
    super({ ...data, type_: ModelType.Tag });

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
      "user_data",
      "deleted_time",
      "type_",
      "master_key_id",
    ];
  }
}

export default Tag;
