import "dotenv/config";
import Synchronizer from "../Synchronizer/Synchronizer";
import { FileApi } from "../FileApi/FileApi";
import { MemorySyncTarget } from "../SyncTarget/MemorySyncTarget";
import JoplinServerSyncTarget from "../SyncTarget/JoplinServerSyncTarget";
import OneDriveSyncTarget from "../SyncTarget/OneDriveSyncTarget";
import GoogleDriveSyncTarget from "../SyncTarget/GoogleDriveSyncTarget";
import WebDAVSyncTarget from "../SyncTarget/WebDAVSyncTarget";

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
    } else if (syncTargetId_ === 3) {
      // OneDrive
      const syncTarget = new OneDriveSyncTarget(null, {
        authToken: process.env.ONEDRIVE_AUTH_TOKEN,
        clientId: process.env.ONEDRIVE_CLIENT_ID,
        clientSecret: process.env.ONEDRIVE_CLIENT_SECRET,
        isPublic: process.env.ONEDRIVE_IS_PUBLIC === "true",
      });
      // Don't call initFileApi() directly - let synchronizer() handle it
      const syncer = await syncTarget.synchronizer();
      const fileApi = await syncTarget.fileApi();
      if (!fileApis_[syncTargetId_]) fileApis_[syncTargetId_] = fileApi;
      synchronizers_[id] = syncer;
    } else if (syncTargetId_ === 10) {
      // GoogleDrive
      const syncTarget = new GoogleDriveSyncTarget(null, {
        authToken: process.env.GOOGLEDRIVE_AUTH_TOKEN,
        clientId: process.env.GOOGLEDRIVE_CLIENT_ID,
        clientSecret: process.env.GOOGLEDRIVE_CLIENT_SECRET,
        isPublic: process.env.GOOGLEDRIVE_IS_PUBLIC === "true",
      });
      // Don't call initFileApi() directly - let synchronizer() handle it
      const syncer = await syncTarget.synchronizer();
      const fileApi = await syncTarget.fileApi();
      if (!fileApis_[syncTargetId_]) fileApis_[syncTargetId_] = fileApi;
      synchronizers_[id] = syncer;
    } else if (syncTargetId_ === 6) {
      // WebDAV
      const syncTarget = new WebDAVSyncTarget(null);
      const options = {
        path: () => process.env.WEBDAV_PATH,
        username: () => process.env.WEBDAV_USERNAME,
        password: () => process.env.WEBDAV_PASSWORD,
        ignoreTlsErrors: () => process.env.WEBDAV_IGNORE_TLS_ERRORS === "true",
      };
      const fileApi = await syncTarget.initFileApi(options);
      if (!fileApis_[syncTargetId_]) fileApis_[syncTargetId_] = fileApi;
      const syncer = await syncTarget.synchronizer();
      synchronizers_[id] = syncer;
    } else if (syncTargetId_ === 2) {
      // Filesystem
    } else {
      // memory sync target as default testing
      // All clients must share the same FileApi so locks work correctly
      const syncTarget = new MemorySyncTarget(null);
      if (fileApis_[syncTargetId_]) {
        // Use existing shared fileApi
        syncTarget.setFileApi(fileApis_[syncTargetId_]);
      } else {
        // First client - create and store fileApi
        const fileApi = await syncTarget.initFileApi();
        fileApis_[syncTargetId_] = fileApi;
      }
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

  // Clear synchronizers array to force fresh instances in next test
  synchronizers_ = [];
}

// eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any -- Old code before rule was applied, Old code before rule was applied
async function expectThrow(
  asyncFn: Function,
  errorCode: any = undefined,
  errorMessage: string = undefined,
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
        `error message: ${errorMessage}`,
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
