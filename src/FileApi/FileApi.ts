import { logger, LoggerWrapper } from "../helpers/logger";
import { singleton } from "../singleton";
import helper from "../helpers/misc";
import { isHidden } from "@joplin/utils/path";
import { Lock, LockClientType, LockType } from "../Synchronizer/Locks";
import BaseItem from "@joplin/lib/models/BaseItem";
import time from "../helpers/time";
const Mutex = require("async-mutex").Mutex;

export interface MultiPutItem {
  name: string;
  body: string;
}

export interface RemoteItem {
  id: string;
  path?: string;
  type_?: number;
  isDeleted?: boolean;

  // This the time when the file was created on the server. It is used for
  // example for the locking mechanim or any file that's not an actual Joplin
  // item.
  updated_time?: number;

  // This is the time that corresponds to the actual Joplin item updated_time
  // value. A note is always uploaded with a delay so the server updated_time
  // value will always be ahead. However for synchronising we need to know the
  // exact Joplin item updated_time value.
  jop_updated_time?: number;

  jopItem?: any;
}

export interface PaginatedList {
  items: RemoteItem[];
  hasMore: boolean;
  context: any;
}
// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
async function tryAndRepeat(fn: Function, count: number) {
  //implement try once, because this library works as a REST API
  let retryCount = 0;

  // Don't use internal fetch retry mechanim since we
  // are already retrying here.
  // const shimFetchMaxRetryPrevious = shim.fetchMaxRetrySet(0);
  // const defer = () => {
  // 	shim.fetchMaxRetrySet(shimFetchMaxRetryPrevious);
  // };
  try {
    const result = await fn();
    // defer();
    return result;
  } catch (err) {
    throw err;
  }

  // while (true) {
  // 	try {
  // 		const result = await fn();
  // 		defer();
  // 		return result;
  // 	} catch (error) {
  // 		if (retryCount >= count || !requestCanBeRepeated(error)) {
  // 			defer();
  // 			throw error;
  // 		}
  // 		retryCount++;
  // 		await time.sleep(1 + retryCount * 3);
  // 	}
  // }
}

export interface DeltaOptions {
  allItemIdsHandler(): Promise<string[]>;
  logger?: LoggerWrapper;
  wipeOutFailSafe: boolean;
  outputLimit: number;
}

export enum GetOptionsTarget {
  String = "string",
  File = "file",
}

export interface GetOptions {
  target?: GetOptionsTarget;
  path?: string;
  encoding?: string;

  source?: string;
}

export interface PutOptions {
  path?: string;
  source?: string;
}

export interface ItemStat {
  path: string;
  updated_time: number;
  isDir: boolean;
}

class FileApi {
  private baseDir_: any;
  private driver_: any;
  private logger_ = logger;
  private syncTargetId_: number = null;
  private tempDirName_: string = null;
  public requestRepeatCount_: number = null; // For testing purpose only - normally this value should come from the driver
  private remoteDateOffset_ = 0;
  private remoteDateNextCheckTime_ = 0;
  private remoteDateMutex_ = new Mutex();
  private initialized_ = false;

  // eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
  public constructor(baseDir: string | Function, driver: any) {
    this.baseDir_ = baseDir;
    this.driver_ = driver;
    this.driver_.fileApi_ = this;
  }

  public async initialize() {
    if (this.initialized_) return;
    this.initialized_ = true;
    if (this.driver_.initialize)
      return this.driver_.initialize(this.fullPath(""));
  }

  // This can be true if the driver implements uploading items in batch. Will
  // probably only be supported by Joplin Server.
  public get supportsMultiPut(): boolean {
    return !!this.driver().supportsMultiPut;
  }

  // This can be true when the sync target timestamps (updated_time) provided
  // in the delta call are guaranteed to be accurate. That requires
  // explicitly setting the timestamp, which is not done anymore on any sync
  // target as it wasn't accurate (for example, the file system can't be
  // relied on, and even OneDrive for some reason doesn't guarantee that the
  // timestamp you set is what you get back).
  //
  // The only reliable one at the moment is Joplin Server since it reads the
  // updated_time property directly from the item (it unserializes it
  // server-side).
  public get supportsAccurateTimestamp(): boolean {
    return !!this.driver().supportsAccurateTimestamp;
  }

  public get supportsLocks(): boolean {
    return !!this.driver().supportsLocks;
  }

  private async fetchRemoteDateOffset_() {
    const tempFile = `${this.tempDirName()}/timeCheck${Math.round(
      Math.random() * 1000000
    )}.txt`;
    const startTime = Date.now();
    await this.put(tempFile, "timeCheck");

    // Normally it should be possible to read the file back immediately but
    // just in case, read it in a loop.
    const loopStartTime = Date.now();
    let stat = null;
    while (Date.now() - loopStartTime < 5000) {
      stat = await this.stat(tempFile);
      if (stat) break;
      await time.msleep(200);
    }

    if (!stat)
      throw new Error("Timed out trying to get sync target clock time");

    void this.delete(tempFile); // No need to await for this call

    const endTime = Date.now();
    const expectedTime = Math.round((endTime + startTime) / 2);
    return stat.updated_time - expectedTime;
  }

  // Approximates the current time on the sync target. It caches the time offset to
  // improve performance.
  public async remoteDate() {
    const shouldSyncTime = () => {
      return (
        !this.remoteDateNextCheckTime_ ||
        Date.now() > this.remoteDateNextCheckTime_
      );
    };

    if (shouldSyncTime()) {
      const release = await this.remoteDateMutex_.acquire();

      try {
        // Another call might have refreshed the time while we were waiting for the mutex,
        // so check again if we need to refresh.
        if (shouldSyncTime()) {
          this.remoteDateOffset_ = await this.fetchRemoteDateOffset_();
          // The sync target clock should rarely change but the device one might,
          // so we need to refresh relatively frequently.
          this.remoteDateNextCheckTime_ = Date.now() + 10 * 60 * 1000;
        }
      } catch (error) {
        logger.warn(
          "Could not retrieve remote date - defaulting to device date:",
          error
        );
        this.remoteDateOffset_ = 0;
        this.remoteDateNextCheckTime_ = Date.now() + 60 * 1000;
      } finally {
        release();
      }
    }

    return new Date(Date.now() + this.remoteDateOffset_);
  }

  // Ideally all requests repeating should be done at the FileApi level to remove duplicate code in the drivers, but
  // historically some drivers (eg. OneDrive) are already handling request repeating, so this is optional, per driver,
  // and it defaults to no repeating.
  public requestRepeatCount() {
    if (this.requestRepeatCount_ !== null) return this.requestRepeatCount_;
    if (this.driver_.requestRepeatCount)
      return this.driver_.requestRepeatCount();
    return 0;
  }

  public lastRequests() {
    return this.driver_.lastRequests ? this.driver_.lastRequests() : [];
  }

  public clearLastRequests() {
    if (this.driver_.clearLastRequests) this.driver_.clearLastRequests();
  }

  public baseDir() {
    return typeof this.baseDir_ === "function"
      ? this.baseDir_()
      : this.baseDir_;
  }

  public tempDirName() {
    if (this.tempDirName_ === null) throw Error("Temp dir not set!");
    return this.tempDirName_;
  }

  public setTempDirName(v: string) {
    this.tempDirName_ = v;
  }

  public fsDriver() {
    return singleton.fsDriver();
  }

  public driver() {
    return this.driver_;
  }

  public setSyncTargetId(v: number) {
    this.syncTargetId_ = v;
  }

  public syncTargetId() {
    if (this.syncTargetId_ === null)
      throw new Error("syncTargetId has not been set!!");
    return this.syncTargetId_;
  }

  public setLogger(l: any) {
    if (!l) l = console;
    this.logger_ = l;
  }

  public logger() {
    return this.logger_;
  }

  public fullPath(path: string) {
    const output = [];
    if (this.baseDir()) output.push(this.baseDir());
    if (path) output.push(path);
    return output.join("/");
  }

  // DRIVER MUST RETURN PATHS RELATIVE TO `path`
  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  public async list(path = "", options: any = null): Promise<PaginatedList> {
    if (!options) options = {};
    if (!("includeHidden" in options)) options.includeHidden = false;
    if (!("context" in options)) options.context = null;
    if (!("includeDirs" in options)) options.includeDirs = true;
    if (!("syncItemsOnly" in options)) options.syncItemsOnly = false;

    logger.debug(`list ${this.baseDir()}`);

    const result: PaginatedList = await tryAndRepeat(
      () => this.driver_.list(this.fullPath(path), options),
      this.requestRepeatCount()
    );

    if (!options.includeHidden) {
      const temp = [];
      for (let i = 0; i < result.items.length; i++) {
        if (!isHidden(result.items[i].path)) temp.push(result.items[i]);
      }
      result.items = temp;
    }

    if (!options.includeDirs) {
      result.items = result.items.filter((f: any) => !f.isDir);
    }

    if (options.syncItemsOnly) {
      result.items = result.items.filter(
        (f: any) => !f.isDir && BaseItem.isSystemPath(f.path)
      );
    }

    return result;
  }

  // Deprecated
  public setTimestamp(path: string, timestampMs: number) {
    logger.debug(`setTimestamp ${this.fullPath(path)}`);
    return tryAndRepeat(
      () => this.driver_.setTimestamp(this.fullPath(path), timestampMs),
      this.requestRepeatCount()
    );
    // return this.driver_.setTimestamp(this.fullPath(path), timestampMs);
  }

  public mkdir(path: string) {
    logger.debug(`mkdir ${this.fullPath(path)}`);
    return tryAndRepeat(
      () => this.driver_.mkdir(this.fullPath(path)),
      this.requestRepeatCount()
    );
  }

  public async stat(path: string) {
    logger.debug(`stat ${this.fullPath(path)}`);

    const output = await tryAndRepeat(
      () => this.driver_.stat(this.fullPath(path)),
      this.requestRepeatCount()
    );

    if (!output) return output;
    output.path = path;
    return output;
  }

  // Returns UTF-8 encoded string by default, or a Response if `options.target = 'file'`
  public get(path: string, options: any = null) {
    if (!options) options = {};
    if (!options.encoding) options.encoding = "utf8";
    logger.debug(`get ${this.fullPath(path)}`);
    return tryAndRepeat(
      () => this.driver_.get(this.fullPath(path), options),
      this.requestRepeatCount()
    );
  }

  public async put(path: string, content: any, options: any = null) {
    logger.debug(`put ${this.fullPath(path)}`, options);

    if (options && options.source === "file") {
      if (!(await this.fsDriver().exists(options.path)))
        throw new Error(`File not found: ${options.path}`);
    }

    return tryAndRepeat(
      () => this.driver_.put(this.fullPath(path), content, options),
      this.requestRepeatCount()
    );
  }

  public async multiPut(items: MultiPutItem[], options: any = null) {
    if (!this.driver().supportsMultiPut)
      throw new Error("Multi PUT not supported");
    return tryAndRepeat(
      () => this.driver_.multiPut(items, options),
      this.requestRepeatCount()
    );
  }

  public delete(path: string) {
    logger.debug(`delete ${this.fullPath(path)}`);
    return tryAndRepeat(
      () => this.driver_.delete(this.fullPath(path)),
      this.requestRepeatCount()
    );
  }

  // Deprecated
  public move(oldPath: string, newPath: string) {
    logger.debug(`move ${this.fullPath(oldPath)} => ${this.fullPath(newPath)}`);
    return tryAndRepeat(
      () => this.driver_.move(this.fullPath(oldPath), this.fullPath(newPath)),
      this.requestRepeatCount()
    );
  }

  // Deprecated
  public format() {
    return tryAndRepeat(() => this.driver_.format(), this.requestRepeatCount());
  }

  public clearRoot() {
    return tryAndRepeat(
      () => this.driver_.clearRoot(this.baseDir()),
      this.requestRepeatCount()
    );
  }

  public delta(path: string, options: any = null): Promise<PaginatedList> {
    logger.debug(`delta ${this.fullPath(path)}`);
    return tryAndRepeat(
      () => this.driver_.delta(this.fullPath(path), options),
      this.requestRepeatCount()
    );
  }

  public async acquireLock(
    type: LockType,
    clientType: LockClientType,
    clientId: string
  ): Promise<Lock> {
    if (!this.supportsLocks)
      throw new Error("Sync target does not support built-in locks");
    return tryAndRepeat(
      () => this.driver_.acquireLock(type, clientType, clientId),
      this.requestRepeatCount()
    );
  }

  public async releaseLock(
    type: LockType,
    clientType: LockClientType,
    clientId: string
  ) {
    if (!this.supportsLocks)
      throw new Error("Sync target does not support built-in locks");
    return tryAndRepeat(
      () => this.driver_.releaseLock(type, clientType, clientId),
      this.requestRepeatCount()
    );
  }

  public async listLocks() {
    if (!this.supportsLocks)
      throw new Error("Sync target does not support built-in locks");
    return tryAndRepeat(
      () => this.driver_.listLocks(),
      this.requestRepeatCount()
    );
  }
}

function basicDeltaContextFromOptions_(options: any) {
  const output: any = {
    timestamp: 0,
    filesAtTimestamp: [],
    statsCache: null,
    statIdsCache: null,
    deletedItemsProcessed: false,
  };

  if (!options || !options.context) return output;

  const d = new Date(options.context.timestamp);

  output.timestamp = isNaN(d.getTime()) ? 0 : options.context.timestamp;
  output.filesAtTimestamp = Array.isArray(options.context.filesAtTimestamp)
    ? options.context.filesAtTimestamp.slice()
    : [];
  output.statsCache =
    options.context && options.context.statsCache
      ? options.context.statsCache
      : null;
  output.statIdsCache =
    options.context && options.context.statIdsCache
      ? options.context.statIdsCache
      : null;
  output.deletedItemsProcessed =
    options.context && "deletedItemsProcessed" in options.context
      ? options.context.deletedItemsProcessed
      : false;

  return output;
}

// This is the basic delta algorithm, which can be used in case the cloud service does not have
// a built-in delta API. OneDrive and Dropbox have one for example, but Nextcloud and obviously
// the file system do not.
// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
async function basicDelta(
  path: string,
  getDirStatFn: Function,
  options: any
): Promise<PaginatedList> {
  let outputLimit = 50;
  if (options.outputLimit) outputLimit = options.outputLimit;

  const itemIds = await options.allLocalItemsIds;
  if (!Array.isArray(itemIds))
    throw new Error("Delta API not supported - local IDs must be provided");

  // const logger = options && options.logger ? options.logger : new Logger();

  const context = basicDeltaContextFromOptions_(options);

  if (context.timestamp > Date.now()) {
    logger.warn(
      `BasicDelta: Context timestamp is greater than current time: ${context.timestamp}`
    );
    logger.warn(
      "BasicDelta: Sync will continue but it is likely that nothing will be synced"
    );
  }

  const newContext = {
    timestamp: context.timestamp,
    filesAtTimestamp: context.filesAtTimestamp.slice(),
    statsCache: context.statsCache,
    statIdsCache: context.statIdsCache,
    deletedItemsProcessed: context.deletedItemsProcessed,
  };

  // Stats are cached until all items have been processed (until hasMore is false)
  if (newContext.statsCache === null) {
    newContext.statsCache = await getDirStatFn(path);
    newContext.statsCache.sort((a: any, b: any) => {
      return a.updated_time - b.updated_time;
    });
    newContext.statIdsCache = newContext.statsCache
      .filter((item: any) => BaseItem.isSystemPath(item.path))
      .map((item: any) => BaseItem.pathToId(item.path));
    newContext.statIdsCache.sort(); // Items must be sorted to use binary search below
  }

  let output = [];

  const updateReport = {
    timestamp: context.timestamp,
    older: 0,
    newer: 0,
    equal: 0,
  };

  // Find out which files have been changed since the last time. Note that we keep
  // both the timestamp of the most recent change, *and* the items that exactly match
  // this timestamp. This to handle cases where an item is modified while this delta
  // function is running. For example:
  // t0: Item 1 is changed
  // t0: Sync items - run delta function
  // t0: While delta() is running, modify Item 2
  // Since item 2 was modified within the same millisecond, it would be skipped in the
  // next sync if we relied exclusively on a timestamp.
  for (let i = 0; i < newContext.statsCache.length; i++) {
    const stat = newContext.statsCache[i];

    if (stat.isDir) continue;

    if (stat.updated_time < context.timestamp) {
      updateReport.older++;
      continue;
    }

    // Special case for items that exactly match the timestamp
    if (stat.updated_time === context.timestamp) {
      if (context.filesAtTimestamp.indexOf(stat.path) >= 0) {
        updateReport.equal++;
        continue;
      }
    }

    if (stat.updated_time > newContext.timestamp) {
      newContext.timestamp = stat.updated_time;
      newContext.filesAtTimestamp = [];
      updateReport.newer++;
    }

    newContext.filesAtTimestamp.push(stat.path);
    output.push(stat);

    if (output.length >= outputLimit) break;
  }

  logger.info(`BasicDelta: Report: ${JSON.stringify(updateReport)}`);

  // TODO: not implementing delete yet
  // if(!newContext.deletedItemsProcessed){
  if (false) {
    // Find out which items have been deleted on the sync target by comparing the items
    // we have to the items on the target.
    // Note that when deleted items are processed it might result in the output having
    // more items than outputLimit. This is acceptable since delete operations are cheap.
    const deletedItems = [];
    for (let i = 0; i < itemIds.length; i++) {
      const itemId = itemIds[i];

      if (helper.binarySearch(newContext.statIdsCache, itemId) < 0) {
        deletedItems.push({
          path: BaseItem.systemPath(itemId),
          isDeleted: true,
        });
      }
    }

    const percentDeleted = itemIds.length
      ? deletedItems.length / itemIds.length
      : 0;

    // If more than 90% of the notes are going to be deleted, it's most likely a
    // configuration error or bug. For example, if the user moves their Nextcloud
    // directory, or if a network drive gets disconnected and returns an empty dir
    // instead of an error. In that case, we don't wipe out the user data, unless
    // they have switched off the fail-safe.
    if (options.wipeOutFailSafe && percentDeleted >= 0.9)
      throw new Error(
        "More than 90% of the notes are going to be deleted. This is likely a configuration error or bug. Sync has been aborted to prevent data loss."
      );

    output = output.concat(deletedItems);
  }

  newContext.deletedItemsProcessed = true;

  const hasMore = output.length >= outputLimit;

  if (!hasMore) {
    // Clear temporary info from context. It's especially important to remove deletedItemsProcessed
    // so that they are processed again on the next sync.
    newContext.statsCache = null;
    newContext.statIdsCache = null;
    delete newContext.deletedItemsProcessed;
  }

  return {
    hasMore: hasMore,
    context: newContext,
    items: output,
  };
}

export { FileApi, basicDelta };
