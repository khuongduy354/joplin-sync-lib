import BaseModel, { ModelType } from "@joplin/lib/BaseModel";
import BaseItem from "@joplin/lib/models/BaseItem";
import Resource from "@joplin/lib/models/Resource";
import path from "path";
import moment from "moment";
import { v4 } from "uuid";
import Note from "@joplin/lib/models/Note";
//@ts-ignore
import sjcl from "@joplin/lib/vendor/sjcl.js";
const shim = require("@joplin/lib/shim");
import crypto from "crypto";
import Setting, { AppType } from "@joplin/lib/models/Setting";
import { Item } from "../types/item";
import { SyncInfo } from "../Synchronizer/syncInfoUtils";
import fs from "fs-extra";
import { e2eInfo } from "../types/e2eInfo";
import Database from "@joplin/lib/database";
import Folder from "@joplin/lib/models/Folder";

// Providing functions to work with Joplin Models Structure

function createBasicItem(type_: number): Item {
  return {
    id: createUUID(),
    type_,
  };
}
type createResourceInput = {
  localResourceContentPath: string;
  title?: string;
  body?: string;
};
export const createResource = (i: createResourceInput): Item => {
  const localResourceContentPath = path.resolve(i.localResourceContentPath);
  let res = fs.statSync(localResourceContentPath);
  if (!res)
    throw new Error("Resource not exist in path: " + localResourceContentPath);

  let basicItem = createBasicItem(4);
  basicItem = {
    ...basicItem,
    ...{ localResourceContentPath, size: res.size },
  };
  return basicItem;
};
export function createNote(i: {
  parent_id: string;
  title?: string;
  body?: string;
}): Item {
  let basicItem = createBasicItem(1);

  i.title = !i.title ? "Untitled" : i.title;
  i.body = i.body || "";

  basicItem = {
    ...basicItem,
    ...{ title: i.title, body: i.body, parent_id: i.parent_id },
  };

  return basicItem;
}

// e2e info and syncInfo helpers
export function addE2EInfoToSyncInfo(
  e2eInfo: e2eInfo,
  syncInfo: SyncInfo
): SyncInfo {
  // reformat info
  const e2eRemoteInfo = {
    e2ee: { value: e2eInfo.e2ee },
    ppk: {
      value: e2eInfo.ppk,
    },
    activeMasterKeyId: {
      value: e2eInfo.activeMasterKeyId,
    },
    masterKeys: [
      {
        id: e2eInfo.activeMasterKeyId,
      },
    ],
  };
  return {
    ...syncInfo.toObject(),
    ...e2eRemoteInfo,
  };
}

export function extractE2EInfoFromSyncInfo(syncInfo: SyncInfo): e2eInfo {
  const e2eInfo = {
    e2ee: syncInfo.e2ee,
    ppk: syncInfo.ppk,
    activeMasterKeyId: syncInfo.activeMasterKeyId,
  };
  return e2eInfo;
}

export function createUUID() {
  return v4().replace(/-/g, "");
}

function unserialize_format(type: ModelType, propName: string, propValue: any) {
  if (propName[propName.length - 1] === "_") return propValue; // Private property

  const ItemClass = BaseItem.itemClass(type);

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
      console.log(propValue);
      propValue = !propValue
        ? "0"
        : parseInt(moment(propValue, "YYYY-MM-DDTHH:mm:ss.SSSZ").format("x"));
    }
  }
  // propValue = Database.formatValue(ItemClass.fieldType(propName), propValue);

  if (propName === "body") return propValue;

  return typeof propValue === "string"
    ? propValue
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\\n/g, "\\n")
        .replace(/\\\r/g, "\\r")
    : propValue;
}
export async function unserializeWithoutSQLite(content: string) {
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
      if (p < 0)
        throw new Error(`Invalid property format: ${line}: ${content}`);
      const key = line.substr(0, p).trim();
      const value = line.substr(p + 1).trim();
      output[key] = value;
    } else if (state === "readingBody") {
      body.splice(0, 0, line);
    }
  }

  if (!output.type_)
    throw new Error(`Missing required property: type_: ${content}`);
  output.type_ = Number(output.type_);

  if (body.length) {
    const title = body.splice(0, 2);
    output.title = title[0];
  }

  if (output.type_ === BaseModel.TYPE_NOTE) output.body = body.join("\n");

  const ItemClass = BaseItem.itemClass(output.type_);
  output = ItemClass.removeUnknownFields(output);

  for (const n in output) {
    if (!output.hasOwnProperty(n)) continue;
    output[n] = await unserialize_format(output.type_, n, output[n]);
  }
  return output;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export function serialize_format(propName: string, propValue: any) {
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
    propValue = `${moment
      .unix(propValue / 1000)
      .utc()
      .format("YYYY-MM-DDTHH:mm:ss.SSS")}Z`;
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export async function serializeModel(item: any, shownKeys: any[] = null) {
  if (shownKeys === null) {
    shownKeys = BaseItem.itemClass(item).fieldNames();
    shownKeys.push("type_");
  }

  // item = this.filter(item);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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
      continue;
      // const r = await key();
      // key = r.key;
      // value = r.value;
    } else {
      value = serialize_format(key, item[key]);
    }

    output.props.push(`${key}: ${value}`);
  }

  const temp = [];

  if (typeof output.title === "string") temp.push(output.title);
  if (output.body) temp.push(output.body);
  if (output.props.length) temp.push(output.props.join("\n"));

  return temp.join("\n\n");
}

// Override some Joplin classes in order to function without SQLite
export function loadClasses() {
  Resource.fieldNames = (withPrefix: boolean = false) => {
    return [
      "id",
      "mime",
      "file_extension",
      "title",
      "filename",
      "created_time",
      "updated_time",
      "encryption_blob_encrypted",
      "encryption_applied",
      "size",
      "share_id",
      "is_shared",
      "blob_updated_time",
      "ocr_text",
      "ocr_status",
      "ocr_details",
      "ocr_error",
      "encryption_cipher_text",
    ];
  };
  Note.fieldNames = (withPrefix: boolean = false) => {
    return [
      "id",
      "title",
      "body",
      "created_time",
      "updated_time",
      "user_updated_time",
      "user_created_time",
      "encryption_cipher_text",
      "encryption_applied",
      "markup_language",
      "is_shared",
      "source",
      "source_application",
      "application_data",
      "order",
      "latitude",
      "longitude",
      "altitude",
      "author",
      "source_url",
      "is_todo",
      "todo_due",
      "todo_completed",
      "is_conflict",
      "user_data",
      "deleted_time",
      "type_",
      "parent_id",
      "is_conflict",
      "share_id",
      "conflict_original_id",
      "master_key_id",
    ];
  };

  Folder.fieldNames = (withPrefix: boolean = false) => {
    return [
      "id",
      "title",
      "created_time",
      "updated_time",
      "user_updated_time",
      "user_created_time",
      "encryption_cipher_text",
      "encryption_applied",
      "parent_id",
      "master_key_id",
      "icon",
      "user_data",
      "deleted_time",
      "type_",
    ];
  };
  // override some classes
  BaseItem.serialize = serializeModel;
  // BaseItem.serializeForSync = serializeForSync;
  BaseItem.unserialize = unserializeWithoutSQLite;

  BaseItem.loadClass("Note", Note);
  BaseItem.loadClass("Resource", Resource);
  BaseItem.loadClass("Folder", Folder);

  // for encryption only
  shim.randomBytes = async (count: number) => {
    const buffer = crypto.randomBytes(count);
    return Array.from(buffer);
  };

  shim.sjclModule = sjcl;
  Setting.constants_.appId = "Sync API";
  Setting.constants_.appType = AppType.Desktop;
  shim.setTimeout = setTimeout;
  shim.waitForFrame = () => {};
  shim.clearTimeout = clearTimeout;
}
