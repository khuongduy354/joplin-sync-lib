import JoplinDatabase from "@joplin/lib/JoplinDatabase";
import { FileApi } from "../FileApi/FileApi";
import { logger } from "../helpers/logger";
import fs from "fs-extra";
import { AppType } from "@joplin/lib/models/Setting";
import ItemUploader from "@joplin/lib/services/synchronizer/ItemUploader";
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
import { parameters_ } from "../helpers/parameter";
import { createUUID } from "../helpers/item";
import resourceRemotePath from "@joplin/lib/services/synchronizer/utils/resourceRemotePath";
import TaskQueue from "@joplin/lib/TaskQueue";
import { fullPathForSyncUpload, setE2EEnabled } from "../E2E";

type UploadResponse = {
  createdIds: string[];
};

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
    //TODO: change params
    this.clientId_ = parameters_.test.id;
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

  public async waitForSyncToFinish() {
    if (this.state() === "idle") return;

    while (true) {
      await time.sleep(1);
      if (this.state() === "idle") return;
    }
  }

  private static reportHasErrors(report: any): boolean {
    return !!report && !!report.errors && !!report.errors.length;
  }

  private static completionTime(report: any): string {
    const duration = report.completedTime - report.startTime;
    if (duration > 1000) return `${Math.round(duration / 1000)}s`;
    return `${duration}ms`;
  }

  public static reportToLines(report: any) {
    const lines = [];
    if (report.createLocal)
      lines.push(_("Created local items: %d.", report.createLocal));
    if (report.updateLocal)
      lines.push(_("Updated local items: %d.", report.updateLocal));
    if (report.createRemote)
      lines.push(_("Created remote items: %d.", report.createRemote));
    if (report.updateRemote)
      lines.push(_("Updated remote items: %d.", report.updateRemote));
    if (report.deleteLocal)
      lines.push(_("Deleted local items: %d.", report.deleteLocal));
    if (report.deleteRemote)
      lines.push(_("Deleted remote items: %d.", report.deleteRemote));
    if (report.fetchingTotal && report.fetchingProcessed)
      lines.push(
        _(
          "Fetched items: %d/%d.",
          report.fetchingProcessed,
          report.fetchingTotal
        )
      );
    if (report.cancelling && !report.completedTime)
      lines.push(_("Cancelling..."));
    if (report.completedTime)
      lines.push(
        _(
          "Completed: %s (%s)",
          time.formatMsToLocal(report.completedTime),
          this.completionTime(report)
        )
      );
    if (this.reportHasErrors(report))
      lines.push(
        _(
          "Last error: %s",
          report.errors[report.errors.length - 1].toString().substr(0, 500)
        )
      );

    return lines;
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

    // Remove Local Files report
    // const folderCount = await Folder.count();
    // const noteCount = await Note.count();
    // const resourceCount = await Resource.count();
    // logger.info(`Total folders: ${folderCount}`);
    // logger.info(`Total notes: ${noteCount}`);
    // logger.info(`Total resources: ${resourceCount}`);

    if (Synchronizer.reportHasErrors(report)) {
      logger.warn("There was some errors:");
      for (let i = 0; i < report.errors.length; i++) {
        const e = report.errors[i];
        logger.warn(e);
      }
    }
  }

  public async cancel() {
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

  public static stateToLabel(state: string) {
    if (state === "idle") return _("Idle");
    if (state === "in_progress") return _("In progress");
    return state;
  }

  public isFullSync(steps: string[]) {
    return (
      steps.includes("update_remote") &&
      steps.includes("delete_remote") &&
      steps.includes("delta")
    );
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

  private async setPpkIfNotExist(localInfo: SyncInfo, remoteInfo: SyncInfo) {
    if (localInfo.ppk || remoteInfo.ppk) return localInfo;

    const password = getMasterPassword(false);
    if (!password) return localInfo;

    localInfo.ppk = await generateKeyPair(this.encryptionService(), password);
    return localInfo;
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

  // options.context.timestamp should be input by user
  // leave empty == 0, means get all remote items
  public async getItemsMetadata(options: any = {}) {
    //TODO: add option: filtering, pagination

    // retrieve remote results after timestamp
    const deltaResult: PaginatedList = await this.apiCall("delta", "", {
      context: options.context,
      allLocalItemsIds: [], // TODO: handle delete operations
      wipeOutFailSafe: false,
      logger: console,
    });

    if (deltaResult.hasMore) {
      // TODO: handle pagination here
      // default limit is 50 items
    }

    return deltaResult;
  }

  public async getItems(options: any = {}) {
    // TODO: current assumming only metadata so no need for this
    // const supportsDeltaWithItems = getSupportsDeltaWithItems(listResult);
    if (!options.deltaResult) {
      logger.warn("No delta result to download");
      return;
    }

    const listResult = options.deltaResult;

    // TODO: assuming metadata only
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

    // TODO: need a way to provide local files
    // const locals = await BaseItem.loadItemsByIds(remoteIds);

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
        return await BaseItem.unserialize(task.result); //TODO: unserialize content here
      };

      const path = remote.path;
      let content = await loadContent();
      result.push(content);
    }

    return result;
  }

  // TODO: unimplemented
  public async applyDeltaToDb(options: any = {}, db: any) {
    // TODO: current assumming only metadata so no need for this
    // const supportsDeltaWithItems = getSupportsDeltaWithItems(listResult);
    if (!options.deltaResult) {
      logger.warn("No delta result to download");
      return;
    }

    while (true) {
      const listResult = options.deltaResult;

      // TODO: assuming metadata only
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

      // TODO: need a way to provide local files
      // const locals = await BaseItem.loadItemsByIds(remoteIds);

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
          return await BaseItem.unserialize(task.result); //TODO: unserialize content here
        };

        const path = remote.path;
        const remoteId = BaseItem.pathToId(path);
        let action: SyncAction = null;
        let reason = "";
        let local = locals.find((l) => l.id === remoteId);
        let ItemClass = null;
        let content = null;

        // TODO: inject database to this step
        try {
          if (!local) {
            if (remote.isDeleted !== true) {
              action = SyncAction.CreateLocal;
              reason = "remote exists but local does not";
              content = await loadContent();
              ItemClass = content ? BaseItem.itemClass(content) : null;
            }
          } else {
            ItemClass = BaseItem.itemClass(local);
            local = ItemClass.filter(local);
            if (remote.isDeleted) {
              action = SyncAction.DeleteLocal;
              reason = "remote has been deleted";
            } else {
              if (
                this.api().supportsAccurateTimestamp &&
                remote.jop_updated_time === local.updated_time
              ) {
                // Nothing to do, and no need to fetch the content
              } else {
                content = await loadContent();
                if (content && content.updated_time > local.updated_time) {
                  action = SyncAction.UpdateLocal;
                  reason = "remote is more recent than local";
                }
              }
            }
          }
        } catch (error) {
          if (error.code === "rejectedByTarget") {
            this.progressReport_.errors.push(error);
            logger.warn(`Rejected by target: ${path}: ${error.message}`);
            action = null;
          } else {
            error.message = `On file ${path}: ${error.message}`;
            throw error;
          }
        }

        // if (
        //   this.testingHooks_.indexOf("skipRevisions") >= 0 &&
        //   content &&
        //   content.type_ === BaseModel.TYPE_REVISION
        // )
        //   action = null;

        if (!action) continue;

        this.logSyncOperation(action, local, remote, reason);

        if (
          action === SyncAction.CreateLocal ||
          action === SyncAction.UpdateLocal
        ) {
          if (content === null) {
            logger.warn(
              `Remote has been deleted between now and the delta() call? In that case it will be handled during the next sync: ${path}`
            );
            continue;
          }
          content = ItemClass.filter(content);

          // 2017-12-03: This was added because the new user_updated_time and user_created_time properties were added
          // to the items. However changing the database is not enough since remote items that haven't been synced yet
          // will not have these properties and, since they are required, it would cause a problem. So this check
          // if they are present and, if not, set them to a reasonable default.
          // Let's leave these two lines for 6 months, by which time all the clients should have been synced.
          if (!content.user_updated_time)
            content.user_updated_time = content.updated_time;
          if (!content.user_created_time)
            content.user_created_time = content.created_time;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
          const options: any = {
            autoTimestamp: false,
            nextQueries: BaseItem.updateSyncTimeQueries(
              syncTargetId,
              content,
              time.unixMs()
            ),
            changeSource: ItemChange.SOURCE_SYNC,
          };
          if (action === SyncAction.CreateLocal) options.isNew = true;
          if (action === SyncAction.UpdateLocal) options.oldItem = local;

          const creatingOrUpdatingResource =
            content.type_ === BaseModel.TYPE_RESOURCE &&
            (action === SyncAction.CreateLocal ||
              action === SyncAction.UpdateLocal);

          if (creatingOrUpdatingResource) {
            if (content.size >= this.maxResourceSize()) {
              await handleCannotSyncItem(
                ItemClass,
                syncTargetId,
                content,
                `File "${
                  content.title
                }" is larger than allowed ${this.maxResourceSize()} bytes. Beyond this limit, the mobile app would crash.`,
                BaseItem.SYNC_ITEM_LOCATION_REMOTE
              );
              continue;
            }

            await ResourceLocalState.save({
              resource_id: content.id,
              fetch_status: Resource.FETCH_STATUS_IDLE,
            });
          }

          if (content.type_ === ModelType.MasterKey) {
            // Special case for master keys - if we download
            // one, we only add it to the store if it's not
            // already there. That can happen for example if
            // the new E2EE migration was processed at a
            // time a master key was still on the sync
            // target. In that case, info.json would not
            // have it.
            //
            // If info.json already has the key we shouldn't
            // update because the most up to date keys
            // should always be in info.json now.
            const existingMasterKey = await MasterKey.load(content.id);
            if (!existingMasterKey) {
              logger.info(
                `Downloaded a master key that was not in info.json - adding it to the store. ID: ${content.id}`
              );
              await MasterKey.save(content);
            }
          } else {
            await ItemClass.save(content, options);
          }

          if (creatingOrUpdatingResource)
            this.dispatch({
              type: "SYNC_CREATED_OR_UPDATED_RESOURCE",
              id: content.id,
            });

          // if (!hasAutoEnabledEncryption && content.type_ === BaseModel.TYPE_MASTER_KEY && !masterKeysBefore) {
          // 	hasAutoEnabledEncryption = true;
          // 	logger.info('One master key was downloaded and none was previously available: automatically enabling encryption');
          // 	logger.info('Using master key: ', content.id);
          // 	await this.encryptionService().enableEncryption(content);
          // 	await this.encryptionService().loadMasterKeysFromSettings();
          // 	logger.info('Encryption has been enabled with downloaded master key as active key. However, note that no password was initially supplied. It will need to be provided by user.');
          // }

          if (content.encryption_applied)
            this.dispatch({ type: "SYNC_GOT_ENCRYPTED_ITEM" });
        } else if (action === SyncAction.DeleteLocal) {
          if (local.type_ === BaseModel.TYPE_FOLDER) {
            localFoldersToDelete.push(local);
            continue;
          }

          const ItemClass = BaseItem.itemClass(local.type_);
          await ItemClass.delete(local.id, {
            trackDeleted: false,
            changeSource: ItemChange.SOURCE_SYNC,
            sourceDescription: "sync: deleteLocal",
          });
        }
      }

      // If user has cancelled, don't record the new context (2) so that synchronisation
      // can start again from the previous context (1) next time. It is ok if some items
      // have been synced between (1) and (2) because the loop above will handle the same
      // items being synced twice as an update. If the local and remote items are identical
      // the update will simply be skipped.
      if (!hasCancelled) {
        if (options.saveContextHandler) {
          const deltaToSave = { ...listResult.context };
          // Remove these two variables because they can be large and can be rebuilt
          // the next time the sync is started.
          delete deltaToSave.statsCache;
          delete deltaToSave.statIdsCache;
          options.saveContextHandler({ delta: deltaToSave });
        }

        if (!listResult.hasMore) {
          newDeltaContext = listResult.context;
          break;
        }
        context = listResult.context;
      }
    }
  }

  // GET single item based on path or id
  public async getItem(options: { path?: string; id?: string }) {
    if (options.id) {
      // id is prioritized
      return await this.apiCall("get", BaseItem.systemPath(options.id));
    }
    if (options.path) {
      return await this.apiCall("get", options.path);
    }

    //TODO: unserialize content here
    // if(options.serialize){

    // }

    return null;
  }

  public async verifySyncInfo() {
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

    // TODO: more details compatability check on sync version
    // await this.migrationHandler().checkCanSync(remoteInfo);
    if (remoteInfo.version !== 3)
      throw new Error(
        `Sync API supports sync version 3, your version is ${remoteInfo.version}, which is not supported.`
      );

    //TODO: app version (a.k.a library version check) if suits with sync version
    // const appVersion = shim.appVersion();
    // if (appVersion !== "unknown") checkIfCanSync(remoteInfo, appVersion);

    // let localInfo = await localSyncInfo();
    // logger.info("Sync target local info:", localInfo.filterSyncInfo());

    // localInfo = await this.setPpkIfNotExist(localInfo, remoteInfo);
    const ppk = remoteInfo.ppk;

    // TODO: handle ppk
    if (ppk) {
      setE2EEnabled(true);

      if (newInfo.e2ee) {
        const mk = getActiveMasterKey(newInfo);
        await setupAndEnableEncryption(this.encryptionService(), mk);
      } else {
        await setupAndDisableEncryption(this.encryptionService());
      }
    }

    // if (!syncInfoEquals(localInfo, remoteInfo)) {
    //   // if (syncTargetIsNew && localInfo.activeMasterKeyId) {
    //   //   localInfo = setMasterKeyHasBeenUsed(
    //   //     localInfo,
    //   //     localInfo.activeMasterKeyId
    //   //   );
    //   // }

    //   // console.info('LOCAL', localInfo);
    //   // console.info('REMOTE', remoteInfo);

    //   let newInfo = mergeSyncInfos(localInfo, remoteInfo);
    //   if (newInfo.activeMasterKeyId)
    //     newInfo = setMasterKeyHasBeenUsed(newInfo, newInfo.activeMasterKeyId);
    //   const previousE2EE = localInfo.e2ee;
    //   logger.info(
    //     "Sync target info differs between local and remote - merging infos: ",
    //     newInfo.toObject()
    //   );

    //   await this.lockHandler().acquireLock(
    //     LockType.Exclusive,
    //     this.lockClientType(),
    //     this.clientId_,
    //     { clearExistingSyncLocksFromTheSameClient: true }
    //   );
    //   await uploadSyncInfo(this.api(), newInfo);
    //   await saveLocalSyncInfo(newInfo);
    //   await this.lockHandler().releaseLock(
    //     LockType.Exclusive,
    //     this.lockClientType(),
    //     this.clientId_
    //   );

    //   // console.info('NEW', newInfo);

    //   if (newInfo.e2ee !== previousE2EE) {
    //     if (newInfo.e2ee) {
    //       const mk = getActiveMasterKey(newInfo);
    //       await setupAndEnableEncryption(this.encryptionService(), mk);
    //     } else {
    //       await setupAndDisableEncryption(this.encryptionService());
    //     }
    //   }
    // } else {
    //   // Set it to remote anyway so that timestamps are the same
    //   // Note: that's probably not needed anymore?
    //   // await uploadSyncInfo(this.api(), remoteInfo);
    // }
  }

  public async createItems(options: any = null) {
    verifySyncInfo();
    // PREPARATION
    if (!options) options = {};

    if (this.state() !== "idle") {
      const error: any = new Error(
        "Synchronisation is already in progress. State: %s" + this.state()
      );
      error.code = "alreadyStarted";
      throw error;
    }

    this.state_ = "in_progress";

    this.onProgress_ = options.onProgress ? options.onProgress : function () {};
    this.progressReport_ = { errors: [] };

    const lastContext = options.context ? options.context : {};

    // const syncSteps = options.syncSteps
    //   ? options.syncSteps
    //   : ["update_remote", "delete_remote", "delta"];

    // The default is to log errors, but when testing it's convenient to be able to catch and verify errors
    // const throwOnError = options.throwOnError === true;

    const syncTargetId = this.api().syncTargetId();

    this.syncTargetIsLocked_ = false;
    this.cancelling_ = false;

    const synchronizationId = time.unixMs().toString();

    const outputContext = { ...lastContext };

    this.progressReport_.startTime = time.unixMs();

    this.dispatch({ type: "SYNC_STARTED" });
    // eventManager.emit(EventName.SyncStart);

    // this.logSyncOperation(
    //   "starting",
    //   null,
    //   null,
    //   `Starting synchronisation to target ${syncTargetId}... supportsAccurateTimestamp = ${
    //     this.api().supportsAccurateTimestamp
    //   }; supportsMultiPut = ${
    //     this.api().supportsMultiPut
    //   }} [${synchronizationId}]`
    // );

    // const handleCannotSyncItem = async (
    //   ItemClass: any,
    //   syncTargetId: any,
    //   item: any,
    //   cannotSyncReason: string,
    //   itemLocation: any = null
    // ) => {
    //   await ItemClass.saveSyncDisabled(
    //     syncTargetId,
    //     item,
    //     cannotSyncReason,
    //     itemLocation
    //   );
    // };

    // We index resources before sync mostly to flag any potential orphan
    // resource before it is being synced. That way, it can potentially be
    // auto-deleted at a later time. Indexing resources is fast so it's fine
    // to call it every time here.
    //
    // https://github.com/laurent22/joplin/issues/932#issuecomment-933736405

    // TODO: resource service
    // try {
    //   if (this.resourceService()) {
    //     logger.info("Indexing resources...");
    //     await this.resourceService().indexNoteResources();
    //   }
    // } catch (error) {
    //   logger.error("Error indexing resources:", error);
    // }

    // Before synchronising make sure all share_id properties are set
    // correctly so as to share/unshare the right items.

    // TODO: share id relook feature
    // try {
    //   await Folder.updateAllShareIds(this.resourceService());
    //   if (this.shareService_) await this.shareService_.checkShareConsistency();
    // } catch (error) {
    //   if (error && error.code === ErrorCode.IsReadOnly) {

    // We ignore it because the functions above tried to modify a
    // read-only item and failed. Normally it shouldn't happen since
    // the UI should prevent, but if there's a bug in the UI or some
    // other issue we don't want sync to fail because of this.
    // logger.error(
    //       "Could not update share because an item is readonly:",
    //       error
    //     );
    //   } else {
    //     throw error;
    //   }
    // }

    const itemUploader = new ItemUploader(this.api(), this.apiCall);

    let errorToThrow = null;
    let syncLock = null;

    try {
      await this.api().initialize();
      this.api().setTempDirName(Dirnames.Temp);

      try {
        let remoteInfo = await fetchSyncInfo(this.api());
        logger.info("Sync target remote info:", remoteInfo.filterSyncInfo());
        // eventManager.emit(EventName.SessionEstablished);

        if (!remoteInfo.version) {
          throw new Error(
            "Sync target must be available before uploading item"
          );
          // logger.info("Sync target is new - setting it up...");
          // await this.migrationHandler().upgrade(Setting.value("syncVersion"));
          // remoteInfo = await fetchSyncInfo(this.api());
          // syncTargetIsNew = true;
        }

        logger.info("Sync target is already setup - checking it...");

        // TODO: set a library supported sync target version (sync info)
        // TODO: E2E
        // await this.migrationHandler().checkCanSync(remoteInfo);

        // const appVersion = shim.appVersion();
        // if (appVersion !== "unknown") checkIfCanSync(remoteInfo, appVersion);

        // let localInfo = await localSyncInfo();
        // logger.info("Sync target local info:", localInfo.filterSyncInfo());

        // localInfo = await this.setPpkIfNotExist(localInfo, remoteInfo);

        // if (syncTargetIsNew && localInfo.activeMasterKeyId) {
        //   localInfo = setMasterKeyHasBeenUsed(
        //     localInfo,
        //     localInfo.activeMasterKeyId
        //   );
        // }

        // console.info('LOCAL', localInfo);
        // console.info('REMOTE', remoteInfo);

        // if (!syncInfoEquals(localInfo, remoteInfo)) {
        //   let newInfo = mergeSyncInfos(localInfo, remoteInfo);
        //   if (newInfo.activeMasterKeyId)
        //     newInfo = setMasterKeyHasBeenUsed(
        //       newInfo,
        //       newInfo.activeMasterKeyId
        //     );
        //   const previousE2EE = localInfo.e2ee;
        //   logger.info(
        //     "Sync target info differs between local and remote - merging infos: ",
        //     newInfo.toObject()
        //   );

        // await this.lockHandler().acquireLock(
        //   LockType.Exclusive,
        //   this.lockClientType(),
        //   this.clientId_,
        //   { clearExistingSyncLocksFromTheSameClient: true }
        // );
        // await uploadSyncInfo(this.api(), newInfo);
        // await saveLocalSyncInfo(newInfo);
        // await this.lockHandler().releaseLock(
        //   LockType.Exclusive,
        //   this.lockClientType(),
        //   this.clientId_
        // );

        // console.info('NEW', newInfo);

        //     if (newInfo.e2ee !== previousE2EE) {
        //       if (newInfo.e2ee) {
        //         const mk = getActiveMasterKey(newInfo);
        //         await setupAndEnableEncryption(this.encryptionService(), mk);
        //       } else {
        //         await setupAndDisableEncryption(this.encryptionService());
        //       }
        //     }
        //   } else {
        //     // Set it to remote anyway so that timestamps are the same
        //     // Note: that's probably not needed anymore?
        //     // await uploadSyncInfo(this.api(), remoteInfo);
        //   }
      } catch (error) {
        // if (error.code === "outdatedSyncTarget") {
        //   Setting.setValue(
        //     "sync.upgradeState",
        //     Setting.SYNC_UPGRADE_STATE_SHOULD_DO
        //   );
        // }
        throw error;
      }

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

      // ========================================================================
      // UPLOAD
      // ------------------------------------------------------------------------
      // Find all the items that have been changed since the
      // last sync and apply the changes to remote.
      // ========================================================================

      const donePaths: string[] = [];
      const idLists: string[] = [];

      const completeItemProcessing = (path: string, id: string) => {
        idLists.push(id);
        donePaths.push(path);
      };

      // TODO: handle cancelling here

      // TODO: batch here to 10
      const locals = options.items as BaseItem[];
      // id generation
      locals.forEach((item) => (item.id = createUUID()));

      console.log(
        "Getting path tree before preupload: ",
        await this.api().list()
      );

      await itemUploader.preUploadItems(locals);

      console.log(
        "Getting path tree after preupload: ",
        await this.api().list()
      );

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

        console.log("Getting path metadata: ", path);
        const remote: RemoteItem = await this.apiCall("stat", path);
        let action: SyncAction = null;
        let itemIsReadOnly = false;
        let reason = "";
        let remoteContent = null;

        const getConflictType = (conflictedItem: any) => {
          if (conflictedItem.type_ === BaseModel.TYPE_NOTE)
            return SyncAction.NoteConflict;
          if (conflictedItem.type_ === BaseModel.TYPE_RESOURCE)
            return SyncAction.ResourceConflict;
          return SyncAction.ItemConflict;
        };

        // TODO: handle conflict here  (resource + note conflict)

        if (remote) {
          // action = SyncAction.ItemConflict
          // reason = "remote item exists, can't create. ";
          console.log("REMOTE EXIST: ", remote);
          throw new Error("Remote item exists, can't create. ");
        }

        // remove this logic because
        // upload item mean create it entirely new, not synced before
        // if (!local.sync_time) {
        action = SyncAction.CreateRemote;
        reason = "Uploading items to remote";
        // } else {
        // Note or item was modified after having been deleted remotely
        // "itemConflict" is for all the items except the notes, which are dealt with in a special way
        // action = getConflictType(local);
        // reason = "remote has been deleted, but local has changes";
        // }

        // We no longer upload Master Keys however we keep them
        // in the database for extra safety. In a future
        // version, once it's confirmed that the new E2EE system
        // works well, we can delete them.
        if (local.type_ === ModelType.MasterKey) action = null; // user should not add master key to upload list, this code is for safety check

        // TODO: in case of resource fail this stills log
        this.logSyncOperation(action, local, remote, reason);

        if (
          action === SyncAction.CreateRemote &&
          local.type_ === BaseModel.TYPE_RESOURCE
        ) {
          try {
            console.log("Processing resource: ", local);
            const remoteContentPath = resourceRemotePath(local.id);
            const { path: localResourceContentPath, resource } =
              await fullPathForSyncUpload(local); // will encryption if E2E is on, else it's the same path as user provided

            // path changed === encrypted -> update resource
            if (localResourceContentPath !== local.localResourceContentPath)
              local = resource;

            // const resource = result.resource;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            // local = resource as any;

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

            // TODO: this logic is ignore, assuming that we're creating a
            // whole new blob + metadata to remote

            // We skip updating the blob if it hasn't
            // been modified since the last sync. In
            // that case, it means the resource metadata
            // (title, filename, etc.) has been changed,
            // but not the data blob.
            // const syncItem = await BaseItem.syncItem(
            //   syncTargetId,
            //   resource.id,
            //   { fields: ["sync_time", "force_sync"] }
            // );
            // const condition =
            //   !syncItem ||
            //   syncItem.sync_time < resource.blob_updated_time ||
            //   syncItem.force_sync;

            if (true) {
              console.log(
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
            }
          } catch (error) {
            // TODO: resource error handler
            console.log("Resource upload error: ", error);

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
            // if (
            //   this.testingHooks_.indexOf("notesRejectedByTarget") >= 0 &&
            //   local.type_ === BaseModel.TYPE_NOTE
            // )
            //   throw new JoplinError(
            //     "Testing rejectedByTarget",
            //     "rejectedByTarget"
            //   );
            // if (this.testingHooks_.indexOf("itemIsReadOnly") >= 0)
            //   throw new JoplinError(
            //     "Testing isReadOnly",
            //     ErrorCode.IsReadOnly
            //   );

            await itemUploader.serializeAndUploadItem(ItemClass, path, local);
          } catch (error) {
            if (error && error.code === "rejectedByTarget") {
              // TODO: callback cannot upload item
              // await handleCannotSyncItem(
              //   ItemClass,
              //   syncTargetId,
              //   local,
              //   error.message
              // );
              canSync = false;
            } else if (error && error.code === ErrorCode.IsReadOnly) {
              action = getConflictType(local);
              itemIsReadOnly = true;
              canSync = false;
            } else {
              throw error;
            }
          }

          // Note: Currently, we set sync_time to update_time, which should work fine given that the resolution is the millisecond.
          // In theory though, this could happen:
          //
          // 1. t0: Editor: Note is modified
          // 2. t0: Sync: Found that note was modified so start uploading it
          // 3. t0: Editor: Note is modified again
          // 4. t1: Sync: Note has finished uploading, set sync_time to t0
          //
          // Later any attempt to sync will not detect that note was modified in (3) (within the same millisecond as it was being uploaded)
          // because sync_time will be t0 too.
          //
          // The solution would be to use something like an etag (a simple counter incremented on every change) to make sure each
          // change is uniquely identified. Leaving it like this for now.

          // TODO: this is done by user
          // if (canSync) {
          //   // 2018-01-21: Setting timestamp is not needed because the delta() logic doesn't rely
          //   // on it (instead it uses a more reliable `context` object) and the itemsThatNeedSync loop
          //   // above also doesn't use it because it fetches the whole remote object and read the
          //   // more reliable 'updated_time' property. Basically remote.updated_time is deprecated.

          //   await ItemClass.saveSyncTime(
          //     syncTargetId,
          //     local,
          //     local.updated_time
          //   );
          // }
        }

        // TODO: callback for conflict handling
        // await handleConflictAction(
        //   action,
        //   ItemClass,
        //   !!remote,
        //   remoteContent,
        //   local,
        //   syncTargetId,
        //   itemIsReadOnly,
        //   (action: any) => this.dispatch(action)
        // );

        completeItemProcessing(path, local.id as string);
      }

      // TODO: after batched, check and break

      // if (!result.hasMore) break;

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
      // TODO: share service
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

      console.log("progressReport_: ", this.progressReport_);
      await this.logSyncSummary(this.progressReport_);

      this.onProgress_ = function () {};
      this.progressReport_ = {};

      // this.dispatch({
      //   type: "SYNC_COMPLETED",
      //   isFullSync: this.isFullSync(syncSteps),
      // });

      this.state_ = "idle";

      if (errorToThrow) throw errorToThrow;

      return { createdIds: idLists };
    } catch (err) {
      throw err;
    }
  }
}
