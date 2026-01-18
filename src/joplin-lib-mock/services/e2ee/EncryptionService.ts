export enum EncryptionMethod {
  SJCL = 1,
  SJCL2 = 2,
  SJCL3 = 3,
  SJCL4 = 4,
  SJCL1a = 5,
  Custom = 6,
  SJCL1b = 7,
}

export interface EncryptionCustomHandler {
  context?: any;
  encrypt(context: any, hexaBytes: string, password: string): Promise<string>;
  decrypt(context: any, hexaBytes: string, password: string): Promise<string>;
}

export interface EncryptOptions {
  encryptionMethod?: EncryptionMethod;
  onProgress?: Function;
  encryptionHandler?: EncryptionCustomHandler;
  masterKeyId?: string;
}

// Mock EncryptionService - simplified implementation
export default class EncryptionService {
  public static instance_: EncryptionService = null;
  public static fsDriver_: any = null;

  private chunkSize_ = 5000;
  private decryptedMasterKeys_: Record<string, any> = {};
  public defaultEncryptionMethod_ = EncryptionMethod.SJCL1a;
  private defaultMasterKeyEncryptionMethod_ = EncryptionMethod.SJCL4;

  public static instance() {
    if (this.instance_) return this.instance_;
    this.instance_ = new EncryptionService();
    return this.instance_;
  }

  public get defaultMasterKeyEncryptionMethod() {
    return this.defaultMasterKeyEncryptionMethod_;
  }

  public loadedMasterKeysCount() {
    return Object.keys(this.decryptedMasterKeys_).length;
  }

  public chunkSize() {
    return this.chunkSize_;
  }

  public defaultEncryptionMethod() {
    return this.defaultEncryptionMethod_;
  }

  public async encrypt(
    method: EncryptionMethod,
    password: string,
    plainText: string,
  ): Promise<string> {
    // Mock encryption - just return base64 encoded
    return Buffer.from(plainText).toString("base64");
  }

  public async decrypt(
    method: EncryptionMethod,
    password: string,
    cipherText: string,
  ): Promise<string> {
    // Mock decryption - just return base64 decoded
    return Buffer.from(cipherText, "base64").toString("utf8");
  }

  public async loadMasterKey(model: any, password: string, makeActive = false) {
    // Mock load master key
    this.decryptedMasterKeys_[model.id] = {
      plainText: password,
      updatedTime: model.updated_time,
    };
  }

  public loadedMasterKey(id: string) {
    if (!this.decryptedMasterKeys_[id]) {
      const error: any = new Error(`Master key is not loaded: ${id}`);
      error.code = "masterKeyNotLoaded";
      error.masterKeyId = id;
      throw error;
    }
    return this.decryptedMasterKeys_[id];
  }

  public async encryptString(plainText: string, options: any): Promise<string> {
    // Mock implementation - just return the plain text
    return plainText;
  }

  public async decryptString(
    encryptedText: string,
    options: any,
  ): Promise<string> {
    // Mock implementation - just return the encrypted text
    return encryptedText;
  }

  public async encryptFile(
    plainTextPath: string,
    encryptedPath: string,
    options: any,
  ): Promise<void> {
    // Mock implementation - do nothing
  }

  public async decryptFile(
    encryptedPath: string,
    plainTextPath: string,
    options: any,
  ): Promise<void> {
    // Mock implementation - do nothing
  }

  public async generateMasterKey(
    password?: string,
    options?: any,
  ): Promise<any> {
    // Mock implementation
    return {
      id: "mock-master-key",
      created_time: Date.now(),
      updated_time: Date.now(),
      content: "mock-content",
      checksum: "mock-checksum",
      encryption_method: options?.encryptionMethod || EncryptionMethod.SJCL1a,
      hashed_password: password || "mock-hash",
      source_application: "mock-app",
      type_: 1,
    };
  }
}
