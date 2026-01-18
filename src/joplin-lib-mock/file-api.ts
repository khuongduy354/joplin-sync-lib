export interface PaginatedList {
  items: any[];
  hasMore: boolean;
  context?: any;
}

export interface RemoteItem {
  id: string;
  path?: string;
  isDir?: boolean;
  jopId?: string;
  jopParentId?: string;
  jopType?: number;
  type_?: number;
}
