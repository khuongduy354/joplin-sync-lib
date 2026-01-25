import BaseItem from "./BaseItem";
import BaseModel from "../BaseModel";

export default class Revision extends BaseItem {
  public static tableName() {
    return "revisions";
  }

  public static modelType() {
    return BaseModel.TYPE_REVISION;
  }

  public static fieldNames(withPrefix: boolean = false): string[] {
    const output = [
      "id",
      "parent_id",
      "item_type",
      "item_id",
      "item_updated_time",
      "title_diff",
      "body_diff",
      "metadata_diff",
      "encryption_cipher_text",
      "encryption_applied",
      "updated_time",
      "created_time",
    ];
    if (withPrefix) {
      return output.map((name) => `revision_${name}`);
    }
    return output;
  }
}
