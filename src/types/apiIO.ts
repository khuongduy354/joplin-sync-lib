import { SyncInfo } from "../Synchronizer/syncInfoUtils";
import { e2eInfo } from "./e2eInfo";
import { CreateItem, DeltaItem, Item } from "./item";

export type getItemsMetadataInput = {
  context: {
    timestamp?: number; //unixMs
    trackDeleteItems?: boolean; // if true, delta returns ids in allItemIdsHandler, that are not in remote items (deleted remotely)
  };
  allItemIdsHandler?: () => Promise<string[]>; // all local items id, used to track remote deleted items
  outputLimit?: number;
};
export type getItemsMetadataOutput = {
  items: DeltaItem[];
  context: { timestamp: number };
};

export type getItemInput = {
  path?: string;
  id?: string;
  unserializeItem?: boolean;
};
export type getItemOutput = Item | string | null;

export type updateItemInput = {
  item: Item;
  lastSync: number; //timestamp in unixMs
};

export type updateItemOutput = {
  status: "conflicted" | "inaccurate timestamp" | "succeeded";
  message: string;

  // return when conflicted, use this to resolve conflict
  remoteItem?: Item;

  //  return when success
  newItem?: Item;
  oldItem?: Item;
  newSyncTime?: number; // updated timestamp
};
export type getItemsInput = {
  ids: string[];
  unserializeAll?: boolean;
};
export type getItemsOutput = Item[];

export type createItemsInput = {
  items: CreateItem[]; //preferably array of Joplin BaseItem
};
export type createItemsOutput = {
  createdItems: Item[];
  failedItems: { item: Item; error: Error }[];
};

export type deleteItemsInput = {
  deleteItems: Item[];
};

export type deleteItemOutput = {
  status:
    | "succeeded"
    | "item not found"
    | "could not delete item"
    | "read-only item can't be deleted";
  item?: Item;
  error?: Error;
};

export type setupE2EOutput = {
  status: "succeeded" | "aborted";
  message: string;
  remoteInfo?: SyncInfo;
  e2eInfo?: e2eInfo;
};
