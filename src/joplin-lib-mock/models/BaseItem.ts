import BaseModel, { ModelType, DeleteOptions } from "../BaseModel";
import { BaseItemEntity } from "../services/database/types";

export default class BaseItem extends BaseModel {
  public static encryptionService_: any = null;
  public static revisionService_: any = null;
  public static shareService_: any = null;

  public static syncItemDefinitions_: any[] = [
    { type: BaseModel.TYPE_NOTE, className: "Note" },
    { type: BaseModel.TYPE_FOLDER, className: "Folder" },
    { type: BaseModel.TYPE_RESOURCE, className: "Resource" },
    { type: BaseModel.TYPE_TAG, className: "Tag" },
    { type: BaseModel.TYPE_NOTE_TAG, className: "NoteTag" },
    { type: BaseModel.TYPE_MASTER_KEY, className: "MasterKey" },
    { type: BaseModel.TYPE_REVISION, className: "Revision" },
  ];

  public static SYNC_ITEM_LOCATION_LOCAL = 1;
  public static SYNC_ITEM_LOCATION_REMOTE = 2;

  public static useUuid() {
    return true;
  }

  public static encryptionSupported() {
    return true;
  }

  public static loadClass(className: string, classRef: any) {
    for (let i = 0; i < BaseItem.syncItemDefinitions_.length; i++) {
      if (BaseItem.syncItemDefinitions_[i].className === className) {
        BaseItem.syncItemDefinitions_[i].classRef = classRef;
        return;
      }
    }
    throw new Error(`Invalid class name: ${className}`);
  }

  public static itemClass(item: any): any {
    // Handle both an item object or just a type number
    let type: number;
    if (typeof item === "number") {
      type = item;
    } else {
      type = item.type_ || item.type;
    }
    for (let i = 0; i < BaseItem.syncItemDefinitions_.length; i++) {
      const def = BaseItem.syncItemDefinitions_[i];
      if (def.type === type) {
        return def.classRef;
      }
    }
    throw new Error(`Unknown item type: ${type}`);
  }

  public static pathToId(path: string): string {
    // Extract ID from path like "abc123.md" -> "abc123"
    const parts = path.split("/");
    const filename = parts[parts.length - 1] || "";
    // Remove extension
    const dotIndex = filename.lastIndexOf(".");
    if (dotIndex > 0) {
      return filename.substring(0, dotIndex);
    }
    return filename;
  }

  public static modelTypeToClassName(type: ModelType): string {
    for (let i = 0; i < BaseItem.syncItemDefinitions_.length; i++) {
      const def = BaseItem.syncItemDefinitions_[i];
      if (def.type === type) {
        return def.className;
      }
    }
    return "Unknown";
  }

  public static async serialize(
    item: any,
    shownKeys: any[] = null,
  ): Promise<string> {
    // Simplified serialization
    return JSON.stringify(item);
  }

  public static async unserialize(content: string): Promise<any> {
    // Simplified deserialization
    return JSON.parse(content);
  }

  // Remove fields that are not in the model's fieldNames
  public static removeUnknownFields(item: any): any {
    const validFields = (this as any).fieldNames
      ? (this as any).fieldNames()
      : [];
    if (validFields.length === 0) {
      // If no fieldNames defined, return item as-is
      return item;
    }
    const output: any = {};
    for (const key of Object.keys(item)) {
      if (validFields.includes(key) || key === "type_") {
        output[key] = item[key];
      }
    }
    return output;
  }

  public static async itemsThatNeedSync(
    syncTargetId: number,
    options: any = null,
  ): Promise<any> {
    return { items: [], hasMore: false, neverSyncedItemIds: [] };
  }

  public static systemPath(itemOrId: any, extension: string = null): string {
    if (extension === null) extension = "md";
    if (typeof itemOrId === "string") return `${itemOrId}.${extension}`;
    else return `${itemOrId.id}.${extension}`;
  }

  public static isSystemPath(path: string): boolean {
    return path.match(/\.(md|png|jpg|jpeg|gif|webp|pdf|txt)$/i) !== null;
  }
}
