import { PublicPrivateKeyPair } from "@joplin/lib/services/e2ee/ppk";

export type getItemsMetadataInput = {
  context: {
    timestamp?: number; //unixMs
  };
  outputLimit?: number;
};
export type getItemsMetadataOutput = {
  items: any[];
  hasMore: boolean;
  context: any;
};

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

export type updateItemOutput = {
  status: "conflicted" | "inaccurate timestamp" | "succeeded";
  message: string;

  // return when conflicted, use this to resolve conflict
  remoteItem?: any;

  //  return when success
  newItem?: any;
  oldItem?: any;
  newSyncTime?: number; // updated timestamp
};
export type getItemsInput = {
  ids: string[];
  unserializeAll?: boolean;
};
export type getItemsOutput = any[];

export type createItemsInput = {
  items: any[]; //preferably array of Joplin BaseItem
};
export type createItemsOutput = {
  createdItems: any[];
  failedItems: { item: any; error: any }[];
};

export type deleteItemsInput = {
  deleteItems: any[];
};

export type deleteItemOutput = {
  status:
    | "succeeded"
    | "item not found"
    | "could not delete item"
    | "read-only item can't be deleted";
  item?: any;
  error?: any;
};

export type verifySyncInfoInput = {
  E2E: {
    ppk?: PublicPrivateKeyPair;
    e2ee: boolean;
  };
};

export type verifySynInfoOutput = {
  status: "success" | "aborted";
  message: string;
  remoteSyncInfo?: any;
};
