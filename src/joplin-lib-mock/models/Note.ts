import BaseItem from "./BaseItem";
import BaseModel from "../BaseModel";
import { NoteEntity } from "../services/database/types";

export default class Note extends BaseItem {
  public static tableName() {
    return "notes";
  }

  public static modelType() {
    return BaseModel.TYPE_NOTE;
  }

  public static newNote(
    parentId: string = "",
    initialState: Partial<NoteEntity> = {},
  ): NoteEntity {
    return {
      id: null,
      parent_id: parentId,
      title: "",
      body: "",
      ...initialState,
    };
  }

  public static previewFields(): string[] {
    return [
      "id",
      "title",
      "body",
      "is_todo",
      "todo_completed",
      "parent_id",
      "updated_time",
      "user_updated_time",
      "user_created_time",
      "encryption_applied",
      "markup_language",
      "is_conflict",
      "is_shared",
      "share_id",
    ];
  }

  public static previewFieldsSql(fields: string[] = null): string[] {
    if (!fields) fields = this.previewFields();
    return fields;
  }

  public static fieldNames(withPrefix: boolean = false): string[] {
    const output = [
      "id",
      "parent_id",
      "title",
      "body",
      "created_time",
      "updated_time",
      "is_conflict",
      "latitude",
      "longitude",
      "altitude",
      "author",
      "source_url",
      "is_todo",
      "todo_due",
      "todo_completed",
      "source",
      "source_application",
      "application_data",
      "order",
      "user_created_time",
      "user_updated_time",
      "encryption_cipher_text",
      "encryption_applied",
      "markup_language",
      "is_shared",
      "share_id",
      "conflict_original_id",
      "master_key_id",
    ];
    if (withPrefix) {
      return output.map((name) => `note_${name}`);
    }
    return output;
  }

  public static async all(): Promise<NoteEntity[]> {
    // Mock implementation - return empty array
    return [];
  }
}
