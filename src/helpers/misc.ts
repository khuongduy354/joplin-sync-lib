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

export default {
  objectToQueryString,
  binarySearch,
};
