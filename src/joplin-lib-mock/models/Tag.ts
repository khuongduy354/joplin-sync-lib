import BaseItem from "./BaseItem";
import BaseModel from "../BaseModel";
import { TagEntity } from "../services/database/types";

export default class Tag extends BaseItem {
  public static tableName() {
    return "tags";
  }

  public static modelType() {
    return BaseModel.TYPE_TAG;
  }

  public static newTag(): TagEntity {
    return {
      id: null,
      title: "",
    };
  }

  public static async save(
    tag: TagEntity,
    options: any = null,
  ): Promise<TagEntity> {
    // Mock save - in real implementation this would save to database
    return tag;
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
    ];
    if (withPrefix) {
      return output.map((name) => `tag_${name}`);
    }
    return output;
  }
}
