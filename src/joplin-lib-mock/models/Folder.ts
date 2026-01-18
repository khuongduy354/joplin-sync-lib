import BaseItem from "./BaseItem";
import BaseModel from "../BaseModel";
import { FolderEntity } from "../services/database/types";

export default class Folder extends BaseItem {
  public static tableName() {
    return "folders";
  }

  public static modelType() {
    return BaseModel.TYPE_FOLDER;
  }

  public static newFolder(): FolderEntity {
    return {
      id: null,
      title: "",
    };
  }

  public static async save(
    folder: FolderEntity,
    options: any = null,
  ): Promise<FolderEntity> {
    // Mock save - in real implementation this would save to database
    return folder;
  }

  public static fieldNames(withPrefix: boolean = false): string[] {
    const output = [
      "id",
      "title",
      "created_time",
      "updated_time",
      "user_created_time",
      "user_updated_time",
      "encryption_cipher_text",
      "encryption_applied",
      "parent_id",
      "is_shared",
      "share_id",
      "master_key_id",
    ];
    if (withPrefix) {
      return output.map((name) => `folder_${name}`);
    }
    return output;
  }

  public static async all(): Promise<FolderEntity[]> {
    // Mock implementation - return empty array
    return [];
  }
}
