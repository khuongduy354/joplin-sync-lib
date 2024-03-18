export enum LockType {
  None = 0,
  Sync = 1,
  Exclusive = 2,
}

export enum LockClientType {
  Desktop = 1,
  Mobile = 2,
  Cli = 3,
}

export interface Lock {
  id?: string;
  type: LockType;
  clientType: LockClientType;
  clientId: string;
  updatedTime?: number;
}
