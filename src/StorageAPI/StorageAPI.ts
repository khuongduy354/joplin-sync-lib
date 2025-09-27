// StorageAPI.ts
// Cleaner wrapper over Synchronizer for simple item CRUD
import { FileSystemSyncTarget } from "../SyncTarget/FileSystemSyncTarget";
import JoplinServerSyncTarget from "../SyncTarget/JoplinServerSyncTarget";
import { MemorySyncTarget } from "../SyncTarget/MemorySyncTarget";
import Synchronizer from "../Synchronizer/Synchronizer";
import { loadClasses } from "../helpers/item";
import { createItemsInput, getItemsInput } from "../types/apiIO";
import { CreateItem } from "../types/item";

// Add more sync targets as needed
type SyncTargetType = "FileSystem" | "JoplinServer" | "Memory";

const SYNC_TARGETS: Record<SyncTargetType, any> = {
  FileSystem: FileSystemSyncTarget,
  JoplinServer: JoplinServerSyncTarget,
  Memory: MemorySyncTarget,
};

type StorageAPIOptions = {
  filesystemOptions?: {
    syncPath?: string; // For FileSystem
  };
  joplinServerOptions?: {
    username: string;
    password: string;
    path: string;
    userContentPath: string;
  };
  // Add more options as needed
};

// A wrapper around Synchronizer, with simplified methods, cleaner interface
export class StorageAPI {
  private readonly syncTargetType: SyncTargetType;
  private readonly options: StorageAPIOptions;
  private syncTarget: any;
  private syncer: Synchronizer;
  private initialized: boolean;

  constructor(
    syncTargetType: SyncTargetType = "FileSystem",
    options: StorageAPIOptions = {}
  ) {
    this.syncTargetType = syncTargetType;
    this.options = options;
    this.syncTarget = null;
    this.syncer = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    loadClasses();

    const SyncTargetClass = SYNC_TARGETS[this.syncTargetType];
    if (!SyncTargetClass)
      throw new Error(`Unknown sync target: ${this.syncTargetType}`);
    this.syncTarget = new SyncTargetClass(null);

    if (this.syncTargetType === "FileSystem") {
      // Default path for FileSystem, can be customized via options
      let syncPath =
        this.options.filesystemOptions?.syncPath ||
        "src/sample_app/Storage/fsSyncTarget";
      await this.syncTarget.initFileApi(syncPath);
    } else if (this.syncTargetType === "JoplinServer") {
      const options = {
        username: () => this.options.joplinServerOptions?.username || "",
        password: () => this.options.joplinServerOptions?.password || "",
        path: () => this.options.joplinServerOptions?.path || "",
        userContentPath: () =>
          this.options.joplinServerOptions?.userContentPath || "",
      };

      // You may want to pass server URL, auth, etc. via options
      await this.syncTarget.initFileApi(options);
    }
    this.syncer = await this.syncTarget.synchronizer();
    await this.syncer.initSyncInfo();
    this.initialized = true;
  }

  async createItem(item: CreateItem) {
    await this.init();
    return this.syncer.createItems({ items: [item] });
  }
  async createItems(items: CreateItem[]) {
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
      const result = await this.syncer.getItems(input);
      return result;
    } else {
      return this.syncer.getAllItems({
        unserializeAll: options?.unserializeAll || false,
      });
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
