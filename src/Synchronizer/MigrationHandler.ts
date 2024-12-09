import LockHandler, { LockClientType, LockType } from "./Locks";
import BaseService from "@joplin/lib/services/BaseService";
import { FileApi } from "../FileApi/FileApi";
import JoplinDatabase from "@joplin/lib/JoplinDatabase";
import { uploadSyncInfo, SyncInfo } from "./syncInfoUtils";

export type MigrationFunction = (
  api: FileApi,
  db: JoplinDatabase
) => Promise<void>;

interface SyncTargetInfo {
  version: number;
}

export default class MigrationHandler extends BaseService {
  private api_: FileApi = null;
  private lockHandler_: LockHandler = null;
  private clientType_: LockClientType;
  private clientId_: string;
  private db_: JoplinDatabase;

  public constructor(
    api: FileApi,
    db: JoplinDatabase,
    lockHandler: LockHandler,
    clientType: LockClientType,
    clientId: string
  ) {
    super();
    this.api_ = api;
    this.db_ = db;
    this.lockHandler_ = lockHandler;
    this.clientType_ = clientType;
    this.clientId_ = clientId;
  }

  public async fetchSyncTargetInfo(): Promise<SyncTargetInfo> {
    const syncTargetInfoText = await this.api_.get("info.json");

    // Returns version 0 if the sync target is empty
    let output: SyncTargetInfo = { version: 0 };

    if (syncTargetInfoText) {
      output = JSON.parse(syncTargetInfoText);
      if (!output.version)
        throw new Error('Missing "version" field in info.json');
    } else {
      const oldVersion = await this.api_.get(".sync/version.txt");
      if (oldVersion) output = { version: 1 };
    }

    return output;
  }

  // This library only need version 3
  public async initSyncInfo3() {
    // acquire lock
    // this.logger().info("MigrationHandler: Acquiring exclusive lock");
    const exclusiveLock = await this.lockHandler_.acquireLock(
      LockType.Exclusive,
      this.clientType_,
      this.clientId_,
      {
        clearExistingSyncLocksFromTheSameClient: true,
        timeoutMs: 1000 * 30,
      }
    );

    let autoLockError = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    this.lockHandler_.startAutoLockRefresh(exclusiveLock, (error: any) => {
      autoLockError = error;
    });

    //   "MigrationHandler: Acquired exclusive lock:",
    // this.logger().info(
    //   exclusiveLock
    // );
    try {
      if (autoLockError) throw autoLockError;

      // Init sync info 3, upload file to remote
      // const syncInfo = localSyncInfo();
      const syncInfo = new SyncInfo();
      syncInfo.version = 3;
      await uploadSyncInfo(this.api_, syncInfo);
      // this.logger().info(`MigrationHandler: Initialized sync target version 3`);

      if (autoLockError) throw autoLockError;
      // saveLocalSyncInfo(syncInfo);
    } catch (error) {
      error.message = `Could not initialize sync target version 3`;
      throw error;
    } finally {
      // release lock
      // this.logger().info("MigrationHandler: Releasing exclusive lock");
      this.lockHandler_.stopAutoLockRefresh(exclusiveLock);
      await this.lockHandler_.releaseLock(
        LockType.Exclusive,
        this.clientType_,
        this.clientId_
      );
      // this.logger().info("MigrationHandler: Released exclusive lock");
    }
  }

  // @ts-ignore: BaseService overriding
  logger() {
    return console;
  }
}
