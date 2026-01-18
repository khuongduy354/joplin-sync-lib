import BaseItem from "./BaseItem";
import BaseModel from "../BaseModel";
import { ResourceEntity } from "../services/database/types";

export default class Resource extends BaseItem {
  public static tableName() {
    return "resources";
  }

  public static modelType() {
    return BaseModel.TYPE_RESOURCE;
  }

  public static newResource(): ResourceEntity {
    return {
      id: null,
      title: "",
    };
  }

  public static isSupportedImageMimeType(mimeType: string): boolean {
    const imageMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/svg+xml",
      "image/webp",
    ];
    return imageMimeTypes.includes(mimeType.toLowerCase());
  }

  public static fieldNames(withPrefix: boolean = false): string[] {
    const output = [
      "id",
      "title",
      "mime",
      "filename",
      "created_time",
      "updated_time",
      "user_created_time",
      "user_updated_time",
      "file_extension",
      "encryption_cipher_text",
      "encryption_applied",
      "encryption_blob_encrypted",
      "size",
      "is_shared",
      "share_id",
      "master_key_id",
    ];
    if (withPrefix) {
      return output.map((name) => `resource_${name}`);
    }
    return output;
  }
}
