import JoplinDatabase from "@joplin/lib/JoplinDatabase";
import { FileApi } from "../FileApi/FileApi";
import { logger } from "../helpers/logger";
import fs from "fs-extra";
import { AppType } from "@joplin/lib/models/Setting";
import ItemUploader from "@joplin/lib/services/synchronizer/ItemUploader";
import { sprintf } from "sprintf-js";
import {
  Dirnames,
  SyncAction,
} from "@joplin/lib/services/synchronizer/utils/types";
import { fetchSyncInfo } from "./syncInfoUtils";
import time from "@joplin/lib/time";
import LockHandler, {
  LockClientType,
  LockType,
  appTypeToLockType,
  hasActiveLock,
} from "./Locks";
import MigrationHandler from "./MigrationHandler";
import BaseItem from "@joplin/lib/models/BaseItem";
import { PaginatedList, RemoteItem } from "@joplin/lib/file-api";
import JoplinError from "@joplin/lib/JoplinError";
import BaseModel, { ModelType } from "@joplin/lib/BaseModel";
import { ErrorCode } from "@joplin/lib/errors";
import { createUUID } from "../helpers/item";
import resourceRemotePath from "@joplin/lib/services/synchronizer/utils/resourceRemotePath";
import TaskQueue from "@joplin/lib/TaskQueue";
import { fullPathForSyncUpload } from "../E2E";
import {
  createItemsInput,
  createItemsOutput,
  getItemInput,
  getItemOutput,
  getItemsInput,
  getItemsMetadataInput,
  getItemsMetadataOutput,
  updateItemInput,
  updateItemOutput,
} from "../types/apiIO";

export default class Synchronizer {
  public static verboseMode = true;

  private db_: any;
  private api_: FileApi;
  private appType_: any;
  private logger_ = logger;
  private state_ = "idle";
  private cancelling_ = false;
  public maxResourceSize_: number = null;
  private downloadQueue_: any = null;
  private clientId_: string;
  private lockHandler_: LockHandler;
  private migrationHandler_: MigrationHandler;
  // private encryptionService_: EncryptionService = null;
  // private resourceService_: ResourceService = null;
  private syncTargetIsLocked_ = false;
  // private shareService_: ShareService = null;
  private lockClientType_: LockClientType = null;

  // Debug flags are used to test certain hard-to-test conditions
  // such as cancelling in the middle of a loop.
  public testingHooks_: string[] = [];

  // eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
  private onProgress_: Function;
  private progressReport_: any = {};

  // eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
  public dispatch: Function;

  public constructor(db: JoplinDatabase, api: FileApi, appType: AppType) {
    this.db_ = db;
    this.api_ = api;
    this.appType_ = appType;
    this.clientId_ = createUUID();
    this.onProgress_ = function () {};
    this.progressReport_ = {};

    this.dispatch = function () {};

    this.apiCall = this.apiCall.bind(this);
  }

  public state() {
    return this.state_;
  }

  public db() {
    return this.db_;
  }

  public api() {
    return this.api_;
  }

  public clientId() {
    return this.clientId_;
  }

  public setLogger(l: any) {
    const previous = this.logger_;
    this.logger_ = l;
    return previous;
  }

  public logger() {
    return this.logger_;
  }

  public lockHandler() {
    if (this.lockHandler_) return this.lockHandler_;
    this.lockHandler_ = new LockHandler(this.api());
    return this.lockHandler_;
  }

  public lockClientType(): LockClientType {
    if (this.lockClientType_) return this.lockClientType_;
    this.lockClientType_ = appTypeToLockType(this.appType_);
    return this.lockClientType_;
  }

  public migrationHandler() {
    if (this.migrationHandler_) return this.migrationHandler_;
    this.migrationHandler_ = new MigrationHandler(
      this.api(),
      this.db(),
      this.lockHandler(),
      this.lockClientType(),
      this.clientId_
    );
    return this.migrationHandler_;
  }

  public maxResourceSize() {
    if (this.maxResourceSize_ !== null) return this.maxResourceSize_;
    return this.appType_ === AppType.Mobile ? 100 * 1000 * 1000 : Infinity;
  }

  public setShareService(v: ShareService) {
    this.shareService_ = v;
  }

  public setEncryptionService(v: any) {
    this.encryptionService_ = v;
  }

  public encryptionService() {
    return this.encryptionService_;
  }

  public setResourceService(v: ResourceService) {
    this.resourceService_ = v;
  }

  protected resourceService(): ResourceService {
    return this.resourceService_;
  }

  private static reportHasErrors(report: any): boolean {
    return !!report && !!report.errors && !!report.errors.length;
  }

  private static completionTime(report: any): string {
    const duration = report.completedTime - report.startTime;
    if (duration > 1000) return `${Math.round(duration / 1000)}s`;
    return `${duration}ms`;
  }

  public logSyncOperation(
    action:
      | SyncAction
      | "cancelling"
      | "starting"
      | "fetchingTotal"
      | "fetchingProcessed"
      | "finished",
    local: any = null,
    remote: RemoteItem = null,
    message: string = null,
    actionCount = 1
  ) {
    const line = ["Sync"];
    line.push(action);
    if (message) line.push(message);

    let type = local && local.type_ ? local.type_ : null;
    if (!type) type = remote && remote.type_ ? remote.type_ : null;

    if (type) line.push(BaseItem.modelTypeToClassName(type));

    if (local) {
      const s = [];
      s.push(local.id);
      line.push(`(Local ${s.join(", ")})`);
    }

    if (remote) {
      const s = [];
      s.push(remote.id ? remote.id : remote.path);
      line.push(`(Remote ${s.join(", ")})`);
    }

    if (Synchronizer.verboseMode) {
      logger.info(line.join(": "));
    } else {
      logger.debug(line.join(": "));
    }

    if (!["fetchingProcessed", "fetchingTotal"].includes(action))
      console.info(line.join(": "));

    if (!this.progressReport_[action]) this.progressReport_[action] = 0;
    this.progressReport_[action] += actionCount;
    this.progressReport_.state = this.state();
    this.onProgress_(this.progressReport_);

    // Make sure we only send a **copy** of the report since it
    // is mutated within this class. Should probably use a lib
    // for this but for now this simple fix will do.
    const reportCopy: any = {};
    for (const n in this.progressReport_)
      reportCopy[n] = this.progressReport_[n];
    if (reportCopy.errors)
      reportCopy.errors = this.progressReport_.errors.slice();
    this.dispatch({ type: "SYNC_REPORT_UPDATE", report: reportCopy });
  }

  public async logSyncSummary(report: any) {
    logger.info("Operations completed: ");
    for (const n in report) {
      if (!report.hasOwnProperty(n)) continue;
      if (n === "errors") continue;
      if (n === "starting") continue;
      if (n === "finished") continue;
      if (n === "state") continue;
      if (n === "startTime") continue;
      if (n === "completedTime") continue;
      logger.info(`${n}: ${report[n] ? report[n] : "-"}`);
    }

    if (Synchronizer.reportHasErrors(report)) {
      logger.warn("There was some errors:");
      for (let i = 0; i < report.errors.length; i++) {
        const e = report.errors[i];
        logger.warn(e);
      }
    }
  }

  public async cancel() {
    // TODO:
    if (this.cancelling_ || this.state() === "idle") return null;

    // Stop queue but don't set it to null as it may be used to
    // retrieve the last few downloads.
    if (this.downloadQueue_) this.downloadQueue_.stop();

    this.logSyncOperation("cancelling", null, null, "");
    this.cancelling_ = true;

    return new Promise((resolve) => {
      const iid = shim.setInterval(() => {
        if (this.state() === "idle") {
          shim.clearInterval(iid);
          resolve(null);
        }
      }, 100);
    });
  }

  public cancelling() {
    return this.cancelling_;
  }

  public logLastRequests() {
    const lastRequests = this.api().lastRequests();
    if (!lastRequests || !lastRequests.length) return;

    for (const r of lastRequests) {
      const timestamp = time.unixMsToLocalHms(r.timestamp);
      logger.info(`Req ${timestamp}: ${r.request}`);
      logger.info(`Res ${timestamp}: ${r.response}`);
    }
  }

  private async lockErrorStatus_() {
    const locks = await this.lockHandler().locks();
    const currentDate = await this.lockHandler().currentDate();

    const hasActiveExclusiveLock = await hasActiveLock(
      locks,
      currentDate,
      this.lockHandler().lockTtl,
      LockType.Exclusive
    );
    if (hasActiveExclusiveLock) return "hasExclusiveLock";

    const hasActiveSyncLock = await hasActiveLock(
      locks,
      currentDate,
      this.lockHandler().lockTtl,
      LockType.Sync,
      this.lockClientType(),
      this.clientId_
    );
    if (!hasActiveSyncLock) return "syncLockGone";

    return "";
  }

  private async apiCall(fnName: string, ...args: any[]) {
    if (this.syncTargetIsLocked_)
      throw new JoplinError(
        "Sync target is locked - aborting API call",
        "lockError"
      );

    try {
      const output = await (this.api() as any)[fnName](...args);
      return output;
    } catch (error) {
      const lockStatus = await this.lockErrorStatus_();
      // When there's an error due to a lock, we re-wrap the error and change the error code so that error handling
      // does not do special processing on the original error. For example, if a resource could not be downloaded,
      // don't mark it as a "cannotSyncItem" since we don't know that.
      if (lockStatus) {
        throw new JoplinError(
          `Sync target lock error: ${lockStatus}. Original error was: ${error.message}`,
          "lockError"
        );
      } else {
        throw error;
      }
    }
  }

  public async verifySyncInfo() {
    try {
      await this.api().initialize();
      this.api().setTempDirName(Dirnames.Temp);
    } catch (error) {
      throw error;
    }

    let remoteInfo = await fetchSyncInfo(this.api());
    logger.info("Sync target remote info:", remoteInfo.filterSyncInfo());
    // eventManager.emit(EventName.SessionEstablished);

    let syncTargetIsNew = false;

    if (!remoteInfo.version) {
      throw new Error(
        "No remote sync info file found. Please initialize sync target with client first."
      );
    }

    logger.info("Sync target is already setup - checking it...");

    if (remoteInfo.version !== 3)
      throw new Error(
        `Sync API supports sync version 3, your version is ${remoteInfo.version}, which is not supported.`
      );

    const ppk = remoteInfo.ppk;

    // TODO: handle ppk
    // if (ppk) {
    //   setE2EEnabled(true);
    // }
  }

  // ====================== Sync Library API ======================

  // options.context.timestamp should be input by user
  // leave empty == 0, means get all remote items
  // options.outputLimit = 50, means get 50 items per method call
  public async getItemsMetadata(
    options: getItemsMetadataInput = {
      context: { timestamp: 0 },
      outputLimit: 50,
    }
  ): Promise<getItemsMetadataOutput> {
    // retrieve remote results after timestamp
    const deltaResult: PaginatedList = await this.apiCall("delta", "", {
      context: options.context,
      allLocalItemsIds: [], // TODO: handle delete operations
      wipeOutFailSafe: false,
      logger: console,
      outputLimit: options.outputLimit,
    });

    return deltaResult;
  }

  public async getItems(options: getItemsInput) {
    // TODO: current assumming only metadata so no need for this
    // const supportsDeltaWithItems = getSupportsDeltaWithItems(listResult);
    if (!options.deltaResult) {
      logger.warn("No delta result to download");
      return;
    }

    const listResult = options.deltaResult;

    // assuming metadata only
    // const supportsDeltaWithItems = getSupportsDeltaWithItems(listResult);

    // logger.info("supportsDeltaWithItems = ", supportsDeltaWithItems);

    const remotes = listResult.items;

    this.logSyncOperation(
      "fetchingTotal",
      null,
      null,
      "Fetching delta items from sync target",
      remotes.length
    );

    const remoteIds = remotes.map((r: any) => BaseItem.pathToId(r.path));

    for (const remote of remotes) {
      let needsToDownload = true;

      // File API default to false
      // if (this.api().supportsAccurateTimestamp) {
      //   const local = locals.find(
      //     (l) => l.id === BaseItem.pathToId(remote.path)
      //   );
      //   if (local && local.updated_time === remote.jop_updated_time)
      //     needsToDownload = false;
      // }

      // if (supportsDeltaWithItems) {
      //   needsToDownload = false;
      // }

      if (needsToDownload) {
        this.downloadQueue_.push(remote.path, async () => {
          return this.apiCall("get", remote.path);
        });
      }
    }

    let result = [] as any[];
    // Comparision of locals and remotes to determine sync action (download or not)
    for (let i = 0; i < remotes.length; i++) {
      this.logSyncOperation(
        "fetchingProcessed",
        null,
        null,
        "Processing fetched item"
      );

      const remote = remotes[i];
      if (!BaseItem.isSystemPath(remote.path)) continue; // The delta API might return things like the .sync, .resource or the root folder

      if (this.downloadQueue_) this.downloadQueue_.stop();
      this.downloadQueue_ = new TaskQueue("syncDownload");
      this.downloadQueue_.logger_ = logger;

      const loadContent = async () => {
        // if (supportsDeltaWithItems) return remote.jopItem;

        const task = await this.downloadQueue_.waitForResult(path);
        if (task.error) throw task.error;
        if (!task.result) return null;
        return await BaseItem.unserialize(task.result);
      };

      const path = remote.path;
      let content = await loadContent();
      result.push(content);
    }

    return result;
  }

  // GET single item based on path or id
  public async getItem(
    options: getItemInput = { unserializeItem: false }
  ): Promise<getItemOutput> {
    let item = null;
    if (options.id) {
      // id is prioritized
      item = await this.apiCall("get", BaseItem.systemPath(options.id));
    } else if (options.path) {
      item = await this.apiCall("get", options.path);
    }

    if (item && options.unserializeItem === true) {
      // unserialize option
      item = await BaseItem.unserialize(item);
    }

    return item;
  }

  public async verifySyncInfo(options: any = {}) {
    try {
      await this.api().initialize();
      this.api().setTempDirName(Dirnames.Temp);
    } catch (error) {
      throw error;
    }

    let remoteInfo = await fetchSyncInfo(this.api());
    logger.info("Sync target remote info:", remoteInfo.filterSyncInfo());
    // eventManager.emit(EventName.SessionEstablished);

    let syncTargetIsNew = false;

    if (!remoteInfo.version) {
      throw new Error(
        "No remote sync info file found. Please initialize sync target with client first."
      );

      // logger.info("Sync target is new - setting it up...");
      // await this.migrationHandler().upgrade(Setting.value("syncVersion"));
      // remoteInfo = await fetchSyncInfo(this.api());
      // syncTargetIsNew = true;
    }

    logger.info("Sync target is already setup - checking it...");

    if (remoteInfo.version !== 3)
      throw new Error(
        `Sync API supports sync version 3, your version is ${remoteInfo.version}, which is not supported.`
      );

    // options = {
    //   E2E: {
    //     ppk:,
    //     e2ee: ,
    //     masterPassword: ,
    //     activeMasterKeyId: ,
    //   }
    // }

    // ===================== E2E =====================
    //     1. INIT LOCAL E2E INFO
    // PPK
    let localE2EInfo = options.E2E || {};
    if (remoteInfo.ppk || options.E2E.ppk) {
      localE2EInfo.ppk = options.E2E.ppk;
    } else if (options.E2E.masterPassword) {
      // generate from password
      localE2EInfo.ppk = await generateKeyPair(
        this.encryptionService(),
        options.E2E.masterPassword
      );
    }

    // 2. MERGE KEYS FROM LOCAL AND REMOTE INFOs

    // merge infos
    // in normal Joplin application, we merge to whatever newer, however in Sync API,
    // local is not allowed to set a new one, so all data depends on remote
    let newE2EInfo = { e2ee: remoteInfo.e2ee, ppk: remoteInfo.ppk };

    // merge master key
    /// we dont need this, since this Sync API cannot enable encryption, therefore, there'll be no extra keys problem, remote key is the default key.
    // if user provides a different key we notify it  as the wrong one

    // const activeMasterKeyId = mergeMasterKey(remoteInfo, options.E2E)

    // 3. ENABLE/DISABLE E2E

    const previousE2EE: boolean = !!options.E2E.e2ee;
    if (newE2EInfo.e2ee !== previousE2EE) {
      if (newE2EInfo.e2ee) {
        //enable
      } else {
        //disable
      }
    }
    // it should return new local sync info
    return {
      newE2EInfo,
    };
  }
  public async updateItem(options: updateItemInput): Promise<updateItemOutput> {
    try {
      await this.verifySyncInfo();

      const { item, lastSync } = options;
      const itemId = item.id;

      // Update a single item, provided a last modified date, if last modified is not matched, it will aborted and a pull request is required
      let remoteItem = await this.getItem({
        id: itemId,
        unserializeItem: true,
      });
      if (!remoteItem) throw new Error("Item not found: " + itemId);

      // check for conflicts
      if (remoteItem.updated_time > lastSync)
        return {
          status: "conflicted",
          message:
            "Both local and remote has been changed since last sync, a conflict may have occured, please resolve it first and provide a new timestamp.",
          remoteItem,
        };

      if (remoteItem.updated_time < lastSync) {
        return {
          status: "inaccurate timestamp",
          message:
            "Remote item hasn't synced initially with this client, or timestamp is incorrect, please pull changes, resolve, and provide a new timestamp",
        };
      }

      // if no conflict found, update the item
      // acquire lock
      logger.info(
        "No remote changes since last sync, proceeding to update the data..."
      );
      const syncLock = await this.lockHandler().acquireLock(
        LockType.Sync,
        this.lockClientType(),
        this.clientId_
      );

      this.lockHandler().startAutoLockRefresh(syncLock, (error: any) => {
        logger.warn(
          "Could not refresh lock - cancelling sync. Error was:",
          error
        );
        this.syncTargetIsLocked_ = true;
        void this.cancel();
      });

      // sanitize input and update item

      const updateTime = time.unixMs();
      const newItem = {
        user_updated_time: updateTime,
        updated_time: updateTime,
        ...remoteItem,
      };
      // limiting updateable fields
      for (let key of [
        "title",
        "body",
        "ocr_details",
        "ocr_text",
        "ocr_status",
        "ocr_error",
      ]) {
        if (options.item[key]) newItem[key] = options.item[key];
      }

      const ItemClass = BaseItem.itemClass(remoteItem);
      const path = BaseItem.systemPath(itemId);
      const itemUploader = new ItemUploader(this.api(), this.apiCall);

      console.log("New item: ", newItem);
      await itemUploader.serializeAndUploadItem(ItemClass, path, newItem);

      // release lock
      if (syncLock) {
        this.lockHandler().stopAutoLockRefresh(syncLock);
        await this.lockHandler().releaseLock(
          LockType.Sync,
          this.lockClientType(),
          this.clientId_
        );
      }
      this.syncTargetIsLocked_ = false;
      return {
        status: "success",
        message:
          "Item updated successfully, please save newItem.updated_time for future sync",
        newItem,
        oldItem: remoteItem,
        newSyncTime: updateTime,
      };
    } catch (err) {
      throw err;
    }
  }

  public async createItems(
    options: createItemsInput
  ): Promise<createItemsOutput> {
    // preparation step
    await this.verifySyncInfo();
    if (!Array.isArray(options.items) || !options.items.length)
      throw new Error("Items are required, and must be an array");

    if (options.items.length > 10)
      throw new Error("Maximum 10 items can be created at once");

    const syncTargetId = this.api().syncTargetId();

    this.syncTargetIsLocked_ = false;
    this.cancelling_ = false;

    const synchronizationId = time.unixMs().toString();

    this.progressReport_.startTime = time.unixMs();

    this.logSyncOperation(
      "starting",
      null,
      null,
      `Starting synchronisation to target ${syncTargetId}... supportsAccurateTimestamp = ${
        this.api().supportsAccurateTimestamp
      }; supportsMultiPut = ${
        this.api().supportsMultiPut
      }} [${synchronizationId}]`
    );

    // Before synchronising make sure all share_id properties are set
    // correctly so as to share/unshare the right items.

    // TODO: share id relook feature
    // try {
    //   await Folder.updateAllShareIds(this.resourceService());
    //   if (this.shareService_) await this.shareService_.checkShareConsistency();
    // } catch (error) {
    //   if (error && error.code === ErrorCode.IsReadOnly) {

    const itemUploader = new ItemUploader(this.api(), this.apiCall);

    let errorToThrow = null;
    let syncLock = null;

    syncLock = await this.lockHandler().acquireLock(
      LockType.Sync,
      this.lockClientType(),
      this.clientId_
    );

    this.lockHandler().startAutoLockRefresh(syncLock, (error: any) => {
      logger.warn(
        "Could not refresh lock - cancelling sync. Error was:",
        error
      );
      this.syncTargetIsLocked_ = true;
      void this.cancel();
    });

    // UPLOAD PROCESS

    const donePaths: string[] = [];
    const doneItems: any[] = [];
    const failedItems: any[] = [];

    const completeItemProcessing = (path: string, item: any) => {
      doneItems.push(item);
      donePaths.push(path);
    };

    const locals = options.items as BaseItem[];

    // id generation
    locals.forEach((item) => {
      item.id = createUUID();
      const timeNow = time.unixMs();
      item.updated_time = timeNow;
      item.created_time = timeNow;
      item.user_updated_time = timeNow;
      item.user_created_time = timeNow;
    });

    for (let i = 0; i < locals.length; i++) {
      let local = locals[i];
      const ItemClass: typeof BaseItem = BaseItem.itemClass(local);
      const path = BaseItem.systemPath(local.id);

      // Safety check to avoid infinite loops.
      // - In fact this error is possible if the item is marked for sync (via sync_time or force_sync) while synchronisation is in
      //   progress. In that case exit anyway to be sure we aren't in a loop and the item will be re-synced next time.
      // - It can also happen if the item is directly modified in the sync target, and set with an update_time in the future. In that case,
      //   the local sync_time will be updated to Date.now() but on the next loop it will see that the remote item still has a date ahead
      //   and will see a conflict. There's currently no automatic fix for this - the remote item on the sync target must be fixed manually
      //   (by setting an updated_time less than current time).
      if (donePaths.indexOf(path) >= 0)
        throw new JoplinError(
          sprintf(
            "Processing a path that has already been done: %s. sync_time was not updated? Remote item has an updated_time in the future?",
            path
          ),
          "processingPathTwice"
        );

      const remote: RemoteItem = await this.apiCall("stat", path);
      let action: SyncAction = null;
      let itemIsReadOnly = false;
      let reason = "";
      // let remoteContent = null;

      if (remote) {
        logger.info("REMOTE EXIST: ", remote);
        throw new Error("Remote item exists, can't create. ");
      }

      action = SyncAction.CreateRemote;
      reason = "Uploading items to remote";

      // We no longer upload Master Keys however we keep them
      // in the database for extra safety. In a future
      // version, once it's confirmed that the new E2EE system
      // works well, we can delete them.
      if (local.type_ === ModelType.MasterKey) action = null; // user should not add master key to upload list, this code is for safety check

      // in case of resource fail this stills log
      this.logSyncOperation(action, local, remote, reason);

      if (
        action === SyncAction.CreateRemote &&
        local.type_ === BaseModel.TYPE_RESOURCE
      ) {
        try {
          logger.info("Processing resource: ", local);
          const remoteContentPath = resourceRemotePath(local.id);
          const { path: localResourceContentPath, resource } =
            await fullPathForSyncUpload(local); // will encryption if E2E is on, else it's the same path as user provided

          // path changed === encrypted -> update resource
          if (localResourceContentPath !== local.localResourceContentPath)
            local = resource;

          if (!localResourceContentPath)
            throw new Error("Local resource content path not specified");

          if (!fs.existsSync(localResourceContentPath)) {
            throw new Error(
              "Blob not found in path: " + localResourceContentPath
            );
          }

          if (!local.size) {
            local.size = fs.statSync(localResourceContentPath).size;
          }

          if (local.size >= 10 * 1000 * 1000) {
            logger.warn(
              `Uploading a large resource (resourceId: ${local.id}, size:${resource.size} bytes) which may tie up the sync process.`
            );
          }

          logger.info(
            "Uploading resource from local path: ",
            localResourceContentPath,
            "to remote: ",
            remoteContentPath
          );
          await this.apiCall("put", remoteContentPath, null, {
            path: localResourceContentPath,
            source: "file",
            shareId: local.share_id,
          });
        } catch (error) {
          // TODO: resource error handler
          logger.error("Resource upload error: ", error);

          // if (isCannotSyncError(error)) {
          //   await handleCannotSyncItem(
          //     ItemClass,
          //     syncTargetId,
          //     local,
          //     error.message
          //   );
          //   action = null;
          // } else if (error && error.code === ErrorCode.IsReadOnly) {
          //   action = getConflictType(local);
          //   itemIsReadOnly = true;
          //   logger.info(
          //     "Resource is readonly and cannot be modified - handling it as a conflict:",
          //     local
          //   );
          // } else {
          //   throw error;
          // }
        }
      } else if (action === SyncAction.CreateRemote) {
        let canSync = true;
        try {
          await itemUploader.serializeAndUploadItem(ItemClass, path, local);
        } catch (error) {
          failedItems.push({ item: local, error });
          if (error && error.code === "rejectedByTarget") {
            canSync = false;
          } else if (error && error.code === ErrorCode.IsReadOnly) {
            // const getConflictType = (conflictedItem: any) => {
            //   if (conflictedItem.type_ === BaseModel.TYPE_NOTE)
            //     return SyncAction.NoteConflict;
            //   if (conflictedItem.type_ === BaseModel.TYPE_RESOURCE)
            //     return SyncAction.ResourceConflict;
            //   return SyncAction.ItemConflict;
            // };
            // action = getConflictType(local);
            // itemIsReadOnly = true;
            // canSync = false;
          } else {
            throw error;
          }
        }
      }

      completeItemProcessing(path, local);
    }

    if (syncLock) {
      this.lockHandler().stopAutoLockRefresh(syncLock);
      await this.lockHandler().releaseLock(
        LockType.Sync,
        this.lockClientType(),
        this.clientId_
      );
    }
    this.syncTargetIsLocked_ = false;

    // After syncing, we run the share service maintenance, which is going
    // to fetch share invitations, if any.
    // TODO: share service add to docs to remind users
    // if (this.shareService_) {
    // 	try {
    // 		await this.shareService_.maintenance();
    // 	} catch (error) {
    // 		logger.error('Could not run share service maintenance:', error);
    // 	}
    // }

    this.progressReport_.completedTime = time.unixMs();

    this.logSyncOperation(
      "finished",
      null,
      null,
      `Synchronisation finished [${synchronizationId}]`
    );

    logger.info("progressReport_: ", this.progressReport_);
    await this.logSyncSummary(this.progressReport_);

    this.onProgress_ = function () {};
    this.progressReport_ = {};

    if (errorToThrow) throw errorToThrow;

    return { createdItems: doneItems, failedItems };
  }
  catch(err) {
    throw err;
  }
}
