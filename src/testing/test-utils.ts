import Synchronizer from "../Synchronizer/Synchronizer";
import { FileApi } from "../FileApi/FileApi";
import { MemorySyncTarget } from "../SyncTarget/MemorySyncTarget";
import FileApiDriverMemory from "../FileApi/Driver/FileApiMemoryDriver";
import { Dirnames } from "@joplin/lib/services/synchronizer/utils/types";
import JoplinServerSyncTarget from "../SyncTarget/JoplinServerSyncTarget";

let synchronizers_: Synchronizer[] = [];
const fileApis_: Record<number, FileApi> = {};
let currentClient_ = 1;
let currentSyncTargetId: number = MemorySyncTarget.id();

function synchronizer(id: number = null) {
  if (id === null) id = currentClient_;
  return synchronizers_[id];
}

// async function initFileApi() {
//   if (fileApis_[syncTargetId_]) return;

//   // default is file memory sync target
//   const isNetworkSyncTarget_ = false;
//   const fileApi = new FileApi("/root", new FileApiDriverMemory());

//   fileApi.requestRepeatCount_ = isNetworkSyncTarget_ ? 1 : 0;

//   fileApis_[syncTargetId_] = fileApi;
// }

function fileApi() {
  return fileApis_[currentSyncTargetId];
}

async function setupDatabaseAndSynchronizer(id: number, options: any = {}) {
  if (id === null) id = currentClient_;

  // BaseService.logger_ = logger;

  // await setupDatabase(id, options);

  // DecryptionWorker.instance_ = null;
  // EncryptionService.instance_ = null;

  // await fs.remove(resourceDir(id));
  // await fs.mkdirp(resourceDir(id));

  // await fs.remove(pluginDir(id));
  // await fs.mkdirp(pluginDir(id));

  currentSyncTargetId = options.syncTargetId || currentSyncTargetId;
  if (!synchronizers_[id]) {
    // default is file memory sync target
    // const SyncTargetClass = SyncTargetRegistry.classById(syncTargetId_);
    // const syncTarget = new SyncTargetClass(db(id));
    let syncTargetId_ = currentSyncTargetId;
    if (syncTargetId_ === 9) {
      // JoplinServer
      const syncTarget = new JoplinServerSyncTarget(null);
      const options = {
        username: () => "admin@localhost",
        password: () => "admin",
        path: () => "http://localhost:22300",
        userContentPath: () => "http://localhost:22300",
      };
      const fileApi = await syncTarget.initFileApi(options);
      if (!fileApis_[syncTargetId_]) fileApis_[syncTargetId_] = fileApi;
      const syncer = await syncTarget.synchronizer();
      synchronizers_[id] = syncer;
    } else if (syncTargetId_ === 2) {
      // Filesystem
    } else {
      // memory sync target as default testing
      const syncTarget = new MemorySyncTarget(null);
      const fileApi = await syncTarget.initFileApi();
      if (!fileApis_[syncTargetId_]) fileApis_[syncTargetId_] = fileApi;
      const syncer = await syncTarget.synchronizer();
      synchronizers_[id] = syncer;
    }

    // For now unset the share service as it's not properly initialised.
    // Share service tests are in ShareService.test.ts normally, and if it
    // becomes necessary to test integration with the synchroniser we can
    // initialize it here.
    // synchronizers_[id].setShareService(null);
  }

  // encryptionServices_[id] = new EncryptionService();
  // revisionServices_[id] = new RevisionService();
  // decryptionWorkers_[id] = new DecryptionWorker();
  // decryptionWorkers_[id].setEncryptionService(encryptionServices_[id]);
  // resourceServices_[id] = new ResourceService();
  // resourceFetchers_[id] = new ResourceFetcher(() => {
  //   return synchronizers_[id].api();
  // });
  // kvStores_[id] = new KvStore();

  // setRSA(RSA);

  await fileApi().initialize();
  await fileApi().clearRoot();
}

async function afterAllCleanUp() {
  if (fileApi()) {
    try {
      await fileApi().clearRoot();
    } catch (error) {
      console.warn("Could not clear sync target root:", error);
    }
  }
}

// eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any -- Old code before rule was applied, Old code before rule was applied
async function expectThrow(
  asyncFn: Function,
  errorCode: any = undefined,
  errorMessage: string = undefined
) {
  let hasThrown = false;
  let thrownError = null;
  try {
    await asyncFn();
  } catch (error) {
    hasThrown = true;
    thrownError = error;
  }

  if (!hasThrown) {
    expect("not throw").toBe("throw");
  } else if (errorMessage !== undefined) {
    if (thrownError.message !== errorMessage) {
      expect(`error message: ${thrownError.message}`).toBe(
        `error message: ${errorMessage}`
      );
    } else {
      expect(true).toBe(true);
    }
  } else if (thrownError.code !== errorCode) {
    console.error(thrownError);
    expect(`error code: ${thrownError.code}`).toBe(`error code: ${errorCode}`);
  } else {
    expect(true).toBe(true);
  }
}

// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
async function expectNotThrow(asyncFn: Function) {
  let thrownError = null;
  try {
    await asyncFn();
  } catch (error) {
    thrownError = error;
  }

  if (thrownError) {
    console.error(thrownError);
    expect(thrownError.message).toBe("");
  } else {
    expect(true).toBe(true);
  }
}

export {
  synchronizer,
  setupDatabaseAndSynchronizer,
  afterAllCleanUp,
  fileApi,
  expectThrow,
  expectNotThrow,
};
