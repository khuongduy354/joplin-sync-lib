export type getItemsMetadataInput = {
  context: {
    timestamp: number; // in unixMs
  };
  outputLimit: number;
};

export type getItemInput = {
  path?: string;
  id?: string;
  unserializeItem: boolean;
};

export type updateItemInput = {
  item: any; //preferably Joplin BaseItem
  lastSync: number; //timestamp in unixMs
};

export type createItemsInput = {
  items: any[]; //preferably array of Joplin BaseItem
};

export type getItemsInput = {};
