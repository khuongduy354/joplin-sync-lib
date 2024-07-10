import { PaginatedList } from "../FileApi/FileApi";

export type getItemsMetadataInput = {
  context: {
    timestamp?: number; //unixMs
  };
  outputLimit?: number;
};
export type getItemsMetadataOutput = PaginatedList;

export type getItemInput = {
  path?: string;
  id?: string;
  unserializeItem?: boolean;
};
export type getItemOutput = string | null | any;

export type updateItemInput = {
  item: any; //preferably Joplin BaseItem
  lastSync: number; //timestamp in unixMs
};
export type updateItemOutput = any;

export type createItemsInput = {
  items: any[]; //preferably array of Joplin BaseItem
};
export type createItemsOutput = {
  createdItems: any[];
  failedItems: { item: any; error: any }[];
};

export type getItemsInput = {
  status: "conflicted" | "inaccurate timestamp provided" | "success";
  message: string;

  // return when conflicted, use this to resolve conflict
  remoteItem?: any;

  //  return when success
  newItem?: any;
  oldItem?: any;
  newSyncTime?: number; // updated timestamp
};
