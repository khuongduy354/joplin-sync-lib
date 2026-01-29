// StorageAPI.ts
// Cleaner wrapper over Synchronizer for simple item CRUD
import { FileSystemSyncTarget } from "../SyncTarget/FileSystemSyncTarget";
import JoplinServerSyncTarget from "../SyncTarget/JoplinServerSyncTarget";
import { MemorySyncTarget } from "../SyncTarget/MemorySyncTarget";
import WebDAVSyncTarget, {
  WebDAVSyncOptions,
} from "../SyncTarget/WebDAVSyncTarget";
import OneDriveSyncTarget from "../SyncTarget/OneDriveSyncTarget";
import GoogleDriveSyncTarget from "../SyncTarget/GoogleDriveSyncTarget";
import Synchronizer from "../Synchronizer/Synchronizer";
import { loadClasses } from "../helpers/item";
import { createItemsInput, getItemsInput } from "../types/apiIO";
import { CreateItem } from "../types/item";
import { logger } from "../helpers";

// Add more sync targets as needed
type SyncTargetType =
  | "FileSystem"
  | "JoplinServer"
  | "Memory"
  | "WebDAV"
  | "OneDrive"
  | "GoogleDrive";

const SYNC_TARGETS: Record<SyncTargetType, any> = {
  FileSystem: FileSystemSyncTarget,
  JoplinServer: JoplinServerSyncTarget,
  Memory: MemorySyncTarget,
  WebDAV: WebDAVSyncTarget,
  OneDrive: OneDriveSyncTarget,
  GoogleDrive: GoogleDriveSyncTarget,
};

type StorageAPIOptions = {
  webDAVOptions?: {
    username: string;
    password: string;
    path: string;
    ignoreTlsErrors?: boolean;
  };
  filesystemOptions?: {
    syncPath?: string; // For FileSystem
  };
  joplinServerOptions?: {
    username: string;
    password: string;
    path: string;
    userContentPath: string;
  };
  oneDriveOptions?: {
    clientId?: string;
    clientSecret?: string;
    authToken?: string; // Optional pre-existing auth token
    isPublic?: boolean; // Whether this is a public client (mobile/desktop)
    context?: string | object; // Optional: Account properties (driveId, accountType)
    oauthFlowHandler?: (authUrl: string) => Promise<string>; // Optional: Custom OAuth flow handler
    redirectUri?: string; // Optional: Custom redirect URI for OAuth callback
    basePath?: string; // Optional: Custom sync folder path (e.g., "/drives/{driveId}/root:/Apps/Joplin")
  };
  googleDriveOptions?: {
    clientId?: string;
    clientSecret?: string;
    authToken?: string; // Optional pre-existing auth token
    isPublic?: boolean; // Whether this is a public client (mobile/desktop)
  };
  // Read-only mode: when true, write operations (createItem, createItems) will throw errors
  readOnly?: boolean;
  // Add more options as needed
};

// A wrapper around Synchronizer, with simplified methods, cleaner interface
export class StorageAPI {
  private readonly syncTargetType: SyncTargetType;
  private readonly options: StorageAPIOptions;
  private syncTarget: any;
  private syncer: Synchronizer;
  private initialized: boolean;
  private readonly readOnly: boolean;

  constructor(
    syncTargetType: SyncTargetType = "FileSystem",
    options: StorageAPIOptions = {}
  ) {
    this.syncTargetType = syncTargetType;
    this.options = options;
    this.syncTarget = null;
    this.syncer = null;
    this.initialized = false;
    this.readOnly = options.readOnly ?? false;
  }

  async init() {
    if (this.initialized) {
      logger.warn(
        "[StorageAPI] Already initialized, skipping init(), you should call it only once."
      );
      return;
    }

    loadClasses();

    const SyncTargetClass = SYNC_TARGETS[this.syncTargetType];
    if (!SyncTargetClass)
      throw new Error(`Unknown sync target: ${this.syncTargetType}`);

    logger.info(
      `[StorageAPI] Initializing StorageAPI with sync target: ${this.syncTargetType}`
    );
    if (this.syncTargetType === "FileSystem") {
      this.syncTarget = new SyncTargetClass(null);
      // Default path for FileSystem, can be customized via options
      let syncPath =
        this.options.filesystemOptions?.syncPath ||
        "src/sample_app/Storage/fsSyncTarget";
      await this.syncTarget.initFileApi(syncPath);
    } else if (this.syncTargetType === "JoplinServer") {
      this.syncTarget = new SyncTargetClass(null);
      const options = {
        username: () => this.options.joplinServerOptions?.username || "",
        password: () => this.options.joplinServerOptions?.password || "",
        path: () => this.options.joplinServerOptions?.path || "",
        userContentPath: () =>
          this.options.joplinServerOptions?.userContentPath || "",
      };

      // You may want to pass server URL, auth, etc. via options
      await this.syncTarget.initFileApi(options);
    } else if (this.syncTargetType === "WebDAV") {
      logger.info("[StorageAPI] Initializing WebDAV sync target");
      this.syncTarget = new SyncTargetClass(null);
      const options: WebDAVSyncOptions = {
        username: () => this.options.webDAVOptions?.username || "",
        password: () => this.options.webDAVOptions?.password || "",
        path: () => this.options.webDAVOptions?.path || "",
        ignoreTlsErrors: () =>
          this.options.webDAVOptions?.ignoreTlsErrors || false,
      };

      await this.syncTarget.initFileApi(options);
    } else if (this.syncTargetType === "OneDrive") {
      const options = {
        clientId: this.options.oneDriveOptions?.clientId,
        clientSecret: this.options.oneDriveOptions?.clientSecret,
        authToken: this.options.oneDriveOptions?.authToken,
        isPublic: this.options.oneDriveOptions?.isPublic ?? true,
        context: this.options.oneDriveOptions?.context,
        oauthFlowHandler: this.options.oneDriveOptions?.oauthFlowHandler,
        redirectUri: this.options.oneDriveOptions?.redirectUri,
        basePath: this.options.oneDriveOptions?.basePath,
      };


      this.syncTarget = new SyncTargetClass(null, options);
      // Don't call initFileApi() here - let synchronizer() handle OAuth flow first
      // await this.syncTarget.initFileApi();

      // Listen for token refresh events
      const api = this.syncTarget.api();
      api.on("authRefreshed", (newAuth: any) => {
        console.log(
          "[StorageAPI] OneDrive token refreshed. Save this token for future use:"
        );
        console.log(JSON.stringify(newAuth));
        // Note: Application should implement token persistence here
        // Example: save to file, database, or secure storage
      });
    } else if (this.syncTargetType === "GoogleDrive") {
      const options = {
        clientId: this.options.googleDriveOptions?.clientId,
        clientSecret: this.options.googleDriveOptions?.clientSecret,
        authToken: this.options.googleDriveOptions?.authToken,
        isPublic: this.options.googleDriveOptions?.isPublic ?? true,
      };

      this.syncTarget = new SyncTargetClass(null, options);
      // Don't call initFileApi() here - let synchronizer() handle OAuth flow first
      // await this.syncTarget.initFileApi();

      // Listen for token refresh events
      const api = this.syncTarget.api();
      api.on("authRefreshed", (newAuth: any) => {
        console.log(
          "[StorageAPI] Google Drive token refreshed. Save this token for future use:"
        );
        console.log(JSON.stringify(newAuth));
        // Note: Application should implement token persistence here
        // Example: save to file, database, or secure storage
      });
    } else {
      throw new Error(`Unsupported sync target type: ${this.syncTargetType}`);
    }
    this.syncer = await this.syncTarget.synchronizer();
    await this.syncer.initSyncInfo();
    this.initialized = true;
  }

  /**
   * Check if StorageAPI is in read-only mode
   */
  public isReadOnly(): boolean {
    return this.readOnly;
  }

  async createItem(item: CreateItem) {
    if (this.readOnly) {
      throw new Error(
        "StorageAPI is in read-only mode. Write operations are disabled."
      );
    }
    await this.init();
    return this.syncer.createItems({ items: [item] });
  }

  async createItems(items: CreateItem[]) {
    if (this.readOnly) {
      throw new Error(
        "StorageAPI is in read-only mode. Write operations are disabled."
      );
    }
    await this.init();
    return this.syncer.createItems({ items });
  }

  // get all items or specific items by IDs
  async getItems(options?: {
    unserializeAll?: boolean;
    ids?: string[];
  }): Promise<any[]> {
    await this.init();
    if (options && options.ids) {
      const input: getItemsInput = {
        ids: options.ids,
        unserializeAll: options.unserializeAll || false,
      };
      logger.info("[StorageAPI.getItems] Fetching items with IDs:", options.ids);
      const result = await this.syncer.getItems(input);
      return result;
    } else {
      logger.info("[StorageAPI.getItems] Fetching all items");
      return this.syncer.getAllItems({
        unserializeAll: options?.unserializeAll || false,
      });
    }
  }

  /**
   * Get the current auth token (for OneDrive/GoogleDrive)
   * Returns null if not applicable or not authenticated
   */
  public getAuthToken(): string | null {
    if (!this.syncTarget) return null;

    // Check if this is OneDrive or GoogleDrive
    if (
      this.syncTargetType === "OneDrive" ||
      this.syncTargetType === "GoogleDrive"
    ) {
      try {
        const api = (this.syncTarget as any).api();
        const auth = api.auth();
        return auth ? JSON.stringify(auth) : null;
      } catch (error) {
        return null;
      }
    }

    return null;
  }

  /**
   * Listen for auth token refresh events (OneDrive/GoogleDrive)
   * @param callback Function to call when auth is refreshed
   */
  public onAuthRefresh(callback: (authToken: string) => void): void {
    if (!this.syncTarget) return;

    if (
      this.syncTargetType === "OneDrive" ||
      this.syncTargetType === "GoogleDrive"
    ) {
      try {
        const api = (this.syncTarget as any).api();
        api.on("authRefreshed", (auth: any) => {
          callback(JSON.stringify(auth));
        });
      } catch (error) {
        // Silently fail if not applicable
      }
    }
  }
}

// // Factory function for convenience
// export default function createStorageAPI(
//   syncTargetType: SyncTargetType = "FileSystem",
//   options: StorageAPIOptions = {}
// ) {
//   return new StorageAPI(syncTargetType, options);
// }
