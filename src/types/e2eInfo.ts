import { PublicPrivateKeyPair } from "@joplin/lib/services/e2ee/ppk";

export type e2eInfo = {
  ppk?: PublicPrivateKeyPair;
  e2ee: boolean;
  activeMasterKeyId?: string;
};
