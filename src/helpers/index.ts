const objectToQueryString = function (query: { [key: string]: any }) {
  if (!query) return "";

  let queryString = "";
  const s = [];
  for (const k in query) {
    if (!query.hasOwnProperty(k)) continue;
    s.push(`${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`);
  }
  queryString = s.join("&");

  return queryString;
};

// https://stackoverflow.com/a/10264318/561309
const binarySearch = function (items: any[], value: any) {
  let startIndex = 0,
    stopIndex = items.length - 1,
    middle = Math.floor((stopIndex + startIndex) / 2);

  while (items[middle] !== value && startIndex < stopIndex) {
    // adjust search area
    if (value < items[middle]) {
      stopIndex = middle - 1;
    } else if (value > items[middle]) {
      startIndex = middle + 1;
    }

    // recalculate middle
    middle = Math.floor((stopIndex + startIndex) / 2);
  }

  // make sure it's the right value
  return items[middle] !== value ? -1 : middle;
};

const isSystemPath = (path: string) => {
  // 1b175bb38bba47baac22b0b47f778113.md
  if (!path || !path.length) return false;
  let p: any = path.split("/");
  p = p[p.length - 1];
  p = p.split(".");
  if (p.length !== 2) return false;
  return p[0].length === 32 && p[1] === "md";
};
const systemPath = (itemOrId: any, extension: string = null) => {
  if (extension === null) extension = "md";

  if (typeof itemOrId === "string") return `${itemOrId}.${extension}`;
  else return `${itemOrId.id}.${extension}`;
};
const pathToId = (path: string): string => {
  const p = path.split("/");
  const s = p[p.length - 1].split(".");
  let name: any = s[0];
  if (!name) return name;
  name = name.split("-");
  return name[name.length - 1];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function serialize_format(propName: string, propValue: any) {
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
export default {
  objectToQueryString,
  binarySearch,
  isSystemPath,
  systemPath,
  pathToId,
};
