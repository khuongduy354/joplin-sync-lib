export interface RSAKeyPair {
  publicKey: string;
  privateKey: string;
}

export interface RSA {
  generateKeyPair(keySize: number): Promise<RSAKeyPair>;
  loadKeys(publicKey: string, privateKey: string): Promise<RSAKeyPair>;
  encrypt(data: string, keyPair: RSAKeyPair): Promise<string>;
  decrypt(data: string, keyPair: RSAKeyPair): Promise<string>;
  publicKey(keyPair: RSAKeyPair): string;
  privateKey(keyPair: RSAKeyPair): string;
}
