export interface Item {
  type_: number;
  id: string;
  parent_id?: string;
  path?: string;

  created_time?: number;
  updated_time?: number;
  user_created_time?: number;
  user_updated_time?: number;

  encryption_applied?: number;
  encryption_cipher_text?: string;
}
export interface CreateItem extends Item {
  // for manually set fields
  overrideId?: string;
  overrideCreatedTime?: number;

  // for blob
  localResourceContentPath?: string;
  size?: number;
}

export interface UpdateItem extends Item {
  // for blob
  localResourceContentPath?: string;
  size?: number;
  updateBlob?: boolean;
}

export interface DeltaItem extends Item {
  isDeleted?: boolean;
}
