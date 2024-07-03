import * as fs from "fs-extra";
import Synchronizer from "../Synchronizer/Synchronizer";
import { FileApi } from "../FileApi/FileApi";
import { FileSystemSyncTarget } from "../SyncTarget/FileSystemSyncTarget";
import { MemorySyncTarget } from "../SyncTarget/MemorySyncTarget";
import SyncTargetRegistry from "@joplin/lib/SyncTargetRegistry";
import FileApiDriverMemory from "../FileApi/Driver/FileApiMemoryDriver";
import { Dirnames } from "@joplin/lib/services/synchronizer/utils/types";

let synchronizers_: Synchronizer[] = [];
const fileApis_: Record<number, FileApi> = {};
let currentClient_ = 1;
let syncTargetId_: number = 1; // memory sync target id

function synchronizer(id: number = null) {
  if (id === null) id = currentClient_;
  return synchronizers_[id];
}

async function initFileApi() {
  if (fileApis_[syncTargetId_]) return;

  // default is file memory sync target
  const isNetworkSyncTarget_ = false;
  const fileApi = new FileApi("/root", new FileApiDriverMemory());

  fileApi.setLogger(console);
  fileApi.setSyncTargetId(syncTargetId_);
  fileApi.setTempDirName(Dirnames.Temp);

  fileApi.requestRepeatCount_ = isNetworkSyncTarget_ ? 1 : 0;

  fileApis_[syncTargetId_] = fileApi;
}

function fileApi() {
  return fileApis_[syncTargetId_];
}

// async function setupDatabase(id: number = null, options: any = null) {
//   options = { keychainEnabled: false, ...options };

//   if (id === null) id = currentClient_;

//   Setting.cancelScheduleSave();

//   // Note that this was changed from `Setting.cache_ = []` to `await
//   // Setting.reset()` during the TypeScript conversion. Normally this is
//   // more correct but something to keep in mind anyway in case there are
//   // some strange async issue related to settings when the tests are
//   // running.
//   await Setting.reset();

//   Setting.setConstant("profileDir", rootProfileDir);
//   Setting.setConstant("rootProfileDir", rootProfileDir);
//   Setting.setConstant("isSubProfile", false);

//   if (databases_[id]) {
//     BaseModel.setDb(databases_[id]);
//     await clearDatabase(id);
//     await loadKeychainServiceAndSettings(
//       options.keychainEnabled
//         ? KeychainServiceDriver
//         : KeychainServiceDriverDummy
//     );
//     Setting.setValue("sync.target", syncTargetId());
//     return;
//   }

//   const filePath = `${dataDir}/test-${id}.sqlite`;

//   try {
//     await fs.unlink(filePath);
//   } catch (error) {
//     // Don't care if the file doesn't exist
//   }

//   databases_[id] = new JoplinDatabase(new DatabaseDriverNode());
//   databases_[id].setLogger(dbLogger);
//   await databases_[id].open({ name: filePath });

//   BaseModel.setDb(databases_[id]);
//   await clearSettingFile(id);
//   await loadKeychainServiceAndSettings(
//     options.keychainEnabled ? KeychainServiceDriver : KeychainServiceDriverDummy
//   );

//   reg.setDb(databases_[id]);
//   Setting.setValue("sync.target", syncTargetId());
// }

async function setupDatabaseAndSynchronizer(id: number, options: any = null) {
  if (id === null) id = currentClient_;

  // BaseService.logger_ = logger;

  // await setupDatabase(id, options);

  // DecryptionWorker.instance_ = null;
  // EncryptionService.instance_ = null;

  // await fs.remove(resourceDir(id));
  // await fs.mkdirp(resourceDir(id));

  // await fs.remove(pluginDir(id));
  // await fs.mkdirp(pluginDir(id));

  if (!synchronizers_[id]) {
    // default is file memory sync target
    // const SyncTargetClass = SyncTargetRegistry.classById(syncTargetId_);
    // const syncTarget = new SyncTargetClass(db(id));

    // memory sync target as default testing
    const syncTarget = new MemorySyncTarget(null);
    await initFileApi();
    // await initFileApi();
    syncTarget.setFileApi(fileApi());
    // syncTarget.setLogger(logger);
    synchronizers_[id] = await syncTarget.synchronizer();

    // For now unset the share service as it's not properly initialised.
    // Share service tests are in ShareService.test.ts normally, and if it
    // becomes necessary to test integration with the synchroniser we can
    // initialize it here.
    synchronizers_[id].setShareService(null);
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
