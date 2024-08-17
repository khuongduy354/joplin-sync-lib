export enum EncryptionMethod {
  SJCL = 1,
  SJCL2 = 2,
  SJCL3 = 3,
  SJCL4 = 4,
  SJCL1a = 5,
  Custom = 6,
  SJCL1b = 7,
}
export type e2eInfo = {
  ppk?: PublicPrivateKeyPair;
  e2ee: boolean;
  activeMasterKeyId?: string;
};

export interface PublicPrivateKeyPair {
  id: string;
  keySize: number;
  publicKey: string;
  privateKey: {
    encryptionMethod: EncryptionMethod;
    ciphertext: string;
  };
  createdTime: number;
}
