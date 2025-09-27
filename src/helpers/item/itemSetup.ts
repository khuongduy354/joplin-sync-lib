import BaseItem from "@joplin/lib/models/BaseItem";
import Resource from "@joplin/lib/models/Resource";
import Note from "@joplin/lib/models/Note";
import Folder from "@joplin/lib/models/Folder";
import shim from "@joplin/lib/shim";
import crypto from "crypto";
//@ts-ignore
import sjcl from "@joplin/lib/vendor/sjcl.js";
import Setting, { AppType } from "@joplin/lib/models/Setting";
import { MODEL_FIELD_NAMES } from "./itemLegacy";
import { ModelType } from "../../Model";
import { serializeModel, unserializeWithoutSQLite } from "./itemSerialization";

// Override some Joplin classes in order to function without SQLite
export function loadClasses() {
  Resource.fieldNames = (withPrefix: boolean = false) => {
    return MODEL_FIELD_NAMES[ModelType.Resource];
  };

  Note.fieldNames = (withPrefix: boolean = false) => {
    return MODEL_FIELD_NAMES[ModelType.Note];
  };

  Folder.fieldNames = (withPrefix: boolean = false) => {
    return MODEL_FIELD_NAMES[ModelType.Folder];
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
