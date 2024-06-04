import BaseItem from "@joplin/lib/models/BaseItem";
import Note from "@joplin/lib/models/Note";
import moment from "moment";
import { v4 } from "uuid";

export function createUUID() {
  return v4().replace(/-/g, "");
}
export const testNoteItem = () => {
  // const itemClass = BaseItem.itemClass(1);

  // let item = new Note();

  const sample = {
    // TODO: id gen here
    id: createUUID(),
    parent_id: "1b0663e319074c0cbd966678dabde0b8",
    title: "Test sync note",
    body: "Test sync note body",
    // TODO: create in upload process
    // created_time: "2024-05-20T10:59:36.204Z",
    // updated_time: "2024-05-20T10:59:37.322Z",
    // user_created_time: "2024-05-20T10:59:36.204Z",
    // user_updated_time: "2024-05-20T10:59:37.322Z",
    is_conflict: 0,
    latitude: 10.7578263,
    longitude: 106.7012968,
    altitude: 0.0,
    author: "",
    source_url: "",
    is_todo: 1,
    todo_due: 0,
    todo_completed: 0,
    // TODO: change to library
    source: "joplin-desktop",
    source_application: "net.cozic.joplin-desktop",
    application_data: "",
    order: 0,
    encryption_cipher_text: "",
    encryption_applied: 0,
    markup_language: 1,
    is_shared: 0,
    share_id: "",
    conflict_original_id: "",
    master_key_id: "",
    user_data: "",
    deleted_time: 0,
    type_: 1,
  };

  // item = { ...item, ...sample };
  return sample;
};

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
  // if (shownKeys === null) {
  //   shownKeys = this.itemClass(item).fieldNames();
  //   shownKeys.push("type_");
  // }

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
