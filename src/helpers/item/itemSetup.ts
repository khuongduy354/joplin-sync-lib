import BaseItem from "../../joplin-lib-mock/models/BaseItem";
import Resource from "../../joplin-lib-mock/models/Resource";
import Note from "../../joplin-lib-mock/models/Note";
import Folder from "../../joplin-lib-mock/models/Folder";
import Revision from "../../joplin-lib-mock/models/Revision";
import shim from "../../joplin-lib-mock/shim";
import crypto from "crypto";
import sjcl from "../../joplin-lib-mock/vendor/sjcl";
import Setting, { AppType } from "../../joplin-lib-mock/models/Setting";
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
  BaseItem.loadClass("Revision", Revision);

  // for encryption only
  shim.randomBytes = async (count: number) => {
    const buffer = crypto.randomBytes(count);
    return Array.from(buffer);
  };

  shim.sjclModule = sjcl;
  Setting.constants_.set("appId", "Sync API");
  Setting.constants_.set("appType", AppType.Desktop);
  shim.setTimeout = setTimeout;
  shim.waitForFrame = () => {};
  shim.clearTimeout = clearTimeout;
}
