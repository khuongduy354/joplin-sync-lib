import { initDb } from "./Database/Database";
import { FileSystemSyncTarget } from "./SyncTarget/FileSystemSyncTarget";

async function main() {
  // path to sqlite database file
  const path = "src/sample_app/Storage/database1";
  // onedrive auth token
  const token = "some token here";

  const db = initDb(path);
  // const db: any = null;
  const syncTarget = new FileSystemSyncTarget(db);

  //   syncTarget.initFileApi();
  //   syncTarget.initSynchronizer();
  //   syncTarget.synchronizer().then((syncer) => syncer.start());
}

console.log("Starting app...");
main();
