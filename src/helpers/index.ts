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
export default {
  objectToQueryString,
  binarySearch,
  isSystemPath,
  systemPath,
  pathToId,
};
