import BaseItem from "./BaseItem";
import BaseModel from "../BaseModel";

export default class NoteTag extends BaseItem {
  public static tableName() {
    return "note_tags";
  }

  public static modelType() {
    return BaseModel.TYPE_NOTE_TAG;
  }

  public static fieldNames(withPrefix: boolean = false): string[] {
    const output = [
      "id",
      "note_id",
      "tag_id",
      "created_time",
      "updated_time",
      "user_created_time",
      "user_updated_time",
      "encryption_cipher_text",
      "encryption_applied",
      "is_shared",
    ];
    if (withPrefix) {
      return output.map((name) => `note_tag_${name}`);
    }
    return output;
  }
}
