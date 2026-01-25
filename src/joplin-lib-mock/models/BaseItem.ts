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

  public static getClass(name: string) {
    try {
      for (let i = 0; i < BaseItem.syncItemDefinitions_.length; i++) {
        if (BaseItem.syncItemDefinitions_[i].className === name) {
          const classRef = BaseItem.syncItemDefinitions_[i].classRef;
          if (!classRef) {
            console.warn(`[BaseItem] Class has not been loaded: ${name}. Returning null.`);
            return null;
          }
          return BaseItem.syncItemDefinitions_[i].classRef;
        }
      }
      console.warn(`[BaseItem] Invalid class name: ${name}. Returning null.`);
      return null;
    } catch (error) {
      console.error(`[BaseItem.getClass] Error getting class ${name}:`, error);
      return null;
    }
  }

  public static getClassByItemType(itemType: ModelType) {
    try {
      for (let i = 0; i < BaseItem.syncItemDefinitions_.length; i++) {
        if (BaseItem.syncItemDefinitions_[i].type === itemType) {
          return BaseItem.syncItemDefinitions_[i].classRef;
        }
      }
      console.warn(`[BaseItem] Invalid item type: ${itemType}. Returning null.`);
      return null;
    } catch (error) {
      console.error(`[BaseItem.getClassByItemType] Error getting class for type ${itemType}:`, error);
      return null;
    }
  }

  public static itemClass(item: any): any {
    try {
      if (!item) {
        console.warn("[BaseItem.itemClass] Item cannot be null. Returning null.");
        return null;
      }

      if (typeof item === "object") {
        if (!("type_" in item)) {
          console.warn("[BaseItem.itemClass] Item does not have a type_ property. Returning null.");
          return null;
        }
        return this.itemClass(item.type_);
      } else {
        for (let i = 0; i < BaseItem.syncItemDefinitions_.length; i++) {
          const d = BaseItem.syncItemDefinitions_[i];
          if (Number(item) === d.type) return this.getClass(d.className);
        }
        console.warn(`[BaseItem.itemClass] Unknown type: ${item}. Returning null.`);
        return null;
      }
    } catch (error) {
      console.error("[BaseItem.itemClass] Error:", error);
      return null;
    }
  }

  public static async findUniqueItemTitle(
    title: string,
    parentId: string = null,
  ) {
    let counter = 1;
    let titleToTry = title;
    while (true) {
      let item = null;

      if (parentId !== null) {
        item = await this.loadByFields({
          title: titleToTry,
          parent_id: parentId,
        });
      } else {
        item = await this.loadByField("title", titleToTry);
      }

      if (!item) return titleToTry;
      titleToTry = `${title} (${counter})`;
      counter++;
      if (counter >= 100) titleToTry = `${title} (${new Date().getTime()})`;
      if (counter >= 1000) throw new Error("Cannot find unique title");
    }
  }

  public static pathToId(path: string): string {
    const p = path.split("/");
    const s = p[p.length - 1].split(".");
    let name: any = s[0];
    if (!name) return name;
    name = name.split("-");
    return name[name.length - 1];
  }

  public static loadItemByPath(path: string) {
    return this.loadItemById(this.pathToId(path));
  }

  public static async loadItemById(id: string, options: any = null) {
    const classes = this.syncItemClassNames();
    for (let i = 0; i < classes.length; i++) {
      const item = await this.getClass(classes[i]).load(id, options);
      if (item) return item;
    }
    return null;
  }

  public static async loadItemsByIds(ids: string[]) {
    if (!ids.length) return [];

    const classes = this.syncItemClassNames();

    let output: any[] = [];
    for (let i = 0; i < classes.length; i++) {
      const ItemClass = this.getClass(classes[i]);
      const sql = `SELECT * FROM ${ItemClass.tableName()} WHERE id IN (${this.escapeIdsForSql(ids)})`;
      const models = await ItemClass.modelSelectAll(sql);
      output = output.concat(models);
    }
    return output;
  }

  public static async loadItemsByTypeAndIds(
    itemType: ModelType,
    ids: string[],
    options: any = null,
  ): Promise<any[]> {
    if (!ids.length) return [];

    const fields = options && options.fields ? options.fields : [];
    const ItemClass = this.getClassByItemType(itemType);
    const fieldsSql = fields.length ? this.db().escapeFields(fields) : "*";
    const sql = `SELECT ${fieldsSql} FROM ${ItemClass.tableName()} WHERE id IN (${this.escapeIdsForSql(ids)})`;
    return ItemClass.modelSelectAll(sql);
  }

  public static async loadItemByTypeAndId(
    itemType: ModelType,
    id: string,
    options: any = null,
  ) {
    const result = await this.loadItemsByTypeAndIds(itemType, [id], options);
    return result.length ? result[0] : null;
  }

  public static loadItemByField(itemType: number, field: string, value: any) {
    const ItemClass = this.itemClass(itemType);
    return ItemClass.loadByField(field, value);
  }

  public static loadItem(itemType: ModelType, id: string, options: any = null) {
    if (!options) options = {};
    const ItemClass = this.itemClass(itemType);
    return ItemClass.load(id, options);
  }

  public static deleteItem(itemType: ModelType, id: string, options: DeleteOptions) {
    const ItemClass = this.itemClass(itemType);
    return ItemClass.delete(id, options);
  }

  public static async delete(id: string, options?: DeleteOptions) {
    return this.batchDelete([id], options);
  }

  public static async batchDelete(ids: string[], options: DeleteOptions) {
    if (!options) options = { sourceDescription: "" };
    // Simplified version - just call parent batchDelete
    await super.batchDelete(ids, options);
  }

  public static syncItemClassNames(): string[] {
    return BaseItem.syncItemDefinitions_.map((def: any) => {
      return def.className;
    });
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

  public static serialize_format(propName: string, propValue: any) {
    if (
      [
        "created_time",
        "updated_time",
        "sync_time",
        "user_updated_time",
        "user_created_time",
      ].indexOf(propName) >= 0
    ) {
      if (!propValue) return "";
      // Simple timestamp formatting (simplified from moment)
      propValue = new Date(propValue).toISOString();
    } else if (["title_diff", "body_diff"].indexOf(propName) >= 0) {
      if (!propValue) return "";
      propValue = JSON.stringify(propValue);
    } else if (propValue === null || propValue === undefined) {
      propValue = "";
    } else {
      propValue = `${propValue}`;
    }

    if (propName === "body") return propValue;

    return propValue
      .replace(/\\n/g, "\\\\n")
      .replace(/\\r/g, "\\\\r")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r");
  }

  public static unserialize_format(type: ModelType, propName: string, propValue: any) {
    if (propName[propName.length - 1] === "_") return propValue; // Private property

    if (["title_diff", "body_diff"].indexOf(propName) >= 0) {
      if (!propValue) return "";
      propValue = JSON.parse(propValue);
    } else if (["longitude", "latitude", "altitude"].indexOf(propName) >= 0) {
      const places = propName === "altitude" ? 4 : 8;
      propValue = Number(propValue).toFixed(places);
    } else {
      if (
        [
          "created_time",
          "updated_time",
          "user_created_time",
          "user_updated_time",
        ].indexOf(propName) >= 0
      ) {
        propValue = !propValue ? "0" : new Date(propValue).getTime().toString();
      }
    }

    if (propName === "body") return propValue;

    return typeof propValue === "string"
      ? propValue
          .replace(/\\n/g, "\n")
          .replace(/\\r/g, "\r")
          .replace(/\\\n/g, "\\n")
          .replace(/\\\r/g, "\\r")
      : propValue;
  }

  public static async serialize(
    item: any,
    shownKeys: any[] = null,
  ): Promise<string> {
    if (shownKeys === null) {
      shownKeys = this.itemClass(item).fieldNames();
      shownKeys.push("type_");
    }

    item = this.filter(item);

    const output: any = {};

    if ("title" in item && shownKeys.indexOf("title") >= 0) {
      output.title = item.title;
    }

    if ("body" in item && shownKeys.indexOf("body") >= 0) {
      output.body = item.body;
    }

    output.props = [];

    for (let i = 0; i < shownKeys.length; i++) {
      let key = shownKeys[i];
      if (key === "title" || key === "body") continue;

      let value = null;
      if (typeof key === "function") {
        const r = await key();
        key = r.key;
        value = r.value;
      } else {
        value = this.serialize_format(key, item[key]);
      }

      output.props.push(`${key}: ${value}`);
    }

    const temp = [];

    if (typeof output.title === "string") temp.push(output.title);
    if (output.body) temp.push(output.body);
    if (output.props.length) temp.push(output.props.join("\n"));

    return temp.join("\n\n");
  }

  public static async unserialize(content: string) {
    try {
      const lines = content.split("\n");
      let output: any = {};
      let state = "readingProps";
      const body: string[] = [];

      for (let i = lines.length - 1; i >= 0; i--) {
        let line = lines[i];

        if (state === "readingProps") {
          line = line.trim();

          if (line === "") {
            state = "readingBody";
            continue;
          }

          const p = line.indexOf(":");
          if (p < 0) {
            console.warn(`[BaseItem.unserialize] Invalid property format: ${line}`);
            continue; // Skip invalid lines instead of throwing
          }
          const key = line.substr(0, p).trim();
          const value = line.substr(p + 1).trim();
          output[key] = value;
        } else if (state === "readingBody") {
          body.splice(0, 0, line);
        }
      }

      if (!output.type_) {
        console.error("[BaseItem.unserialize] Missing required property: type_");
        return null; // Return null instead of throwing
      }
      output.type_ = Number(output.type_);

      if (body.length) {
        const title = body.splice(0, 2);
        output.title = title[0];
      }

      if (output.type_ === BaseModel.TYPE_NOTE) output.body = body.join("\n");

      const ItemClass = this.itemClass(output.type_);
      if (!ItemClass) {
        console.warn(`[BaseItem.unserialize] Cannot unserialize item with type ${output.type_}: class not loaded`);
        return null; // Return null if class not found
      }
      
      // Safely call removeUnknownFields if it exists
      if (typeof ItemClass.removeUnknownFields === 'function') {
        output = ItemClass.removeUnknownFields(output);
      } else {
        console.warn(`[BaseItem.unserialize] Class for type ${output.type_} does not have removeUnknownFields method`);
      }

      for (const n in output) {
        if (!output.hasOwnProperty(n)) continue;
        output[n] = await this.unserialize_format(output.type_, n, output[n]);
      }

      return output;
    } catch (error) {
      console.error("[BaseItem.unserialize] Error unserializing content:", error);
      return null; // Return null on error instead of throwing
    }
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
    // Check for 32-character hex ID with .md extension
    if (!path || !path.length) return false;
    let p: any = path.split("/");
    p = p[p.length - 1];
    p = p.split(".");
    if (p.length !== 2) return false;
    return p[0].length === 32 && p[1] === "md";
  }
}
