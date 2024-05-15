import { initDb } from "./Database/Database";
import { FileSystemSyncTarget } from "./SyncTarget/FileSystemSyncTarget";

async function main() {
  // path to sqlite database file
  const path1 = "src/sample_app/Storage/database1.sqlite";
  try {
    const db = await initDb(path1);
  } catch (e) {
    console.log(e);
  }

  // const db: any = null;
  // const syncTarget = new FileSystemSyncTarget(db);

  //   syncTarget.initFileApi();
  //   syncTarget.initSynchronizer();
  //   syncTarget.synchronizer().then((syncer) => syncer.start());
}

console.log("Starting app...");
main();
