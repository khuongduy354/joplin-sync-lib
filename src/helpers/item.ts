import BaseModel from "@joplin/lib/BaseModel";
import BaseItem from "@joplin/lib/models/BaseItem";
import moment from "moment";
import { v4 } from "uuid";

export function createUUID() {
  return v4().replace(/-/g, "");
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

  // for (const n in output) {
  //   if (!output.hasOwnProperty(n)) continue;
  //   output[n] = await this.unserialize_format(output.type_, n, output[n]);
  // }

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
