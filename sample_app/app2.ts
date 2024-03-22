// function syncDb(dbPath: string){
//     const syncTarget = new OneDriveSyncTarget();
//     if(!syncTarget.isAuthenticated()){
//         console.log("Not authenticated, please authenticate first");
//         return;
//     }

import { initDb } from "../Database/Database";
import { singleton } from "../singleton";

//     let syncer = syncTarget.synchronizer();
//     const syncOptions = {}

//     syncer.start(syncOptions);
// }
function main() {
  const path = "/sample_app/Storage/database2";
  singleton.setupDb(initDb(path));
  // const db1 = ""
  // const db2 = ""
  // syncDb(db1);
  // syncDb(db2);
}
