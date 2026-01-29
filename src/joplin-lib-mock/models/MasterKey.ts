import BaseItem from "./BaseItem";
import BaseModel from "../BaseModel";

export default class MasterKey extends BaseItem {
  public static tableName() {
    return "master_keys";
  }

  public static modelType() {
    return BaseModel.TYPE_MASTER_KEY;
  }

  public static fieldNames(withPrefix: boolean = false): string[] {
    const output = [
      "id",
      "created_time",
      "updated_time",
      "source_application",
      "encryption_method",
      "checksum",
      "content",
    ];
    if (withPrefix) {
      return output.map((name) => `master_key_${name}`);
    }
    return output;
  }
}
