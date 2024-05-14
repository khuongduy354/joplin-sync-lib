import { initDb } from "./Database/Database";
import SyncTargetOneDrive from "./SyncTarget/OneDriveSyncTarget";

let parameters_: any = {};

parameters_.test = {
  oneDriveTest: {
    id: "f1e68e1e-a729-4514-b041-4fdd5c7ac03a",
    secret: "~PC7cwAC_AXGICk_V0~12SmI9lbaC-MBDT",
  },
};

parameters_.dev = {
  oneDrive: {
    id: "cbabb902-d276-4ea4-aa88-062a5889d6dc",
    secret: "YSvrgQMqw9NzVqgiLfuEky1",
  },
  oneDriveDemo: {
    id: "606fd4d7-4dfb-4310-b8b7-a47d96aa22b6",
    secret: "qabchuPYL7931$ePDEQ3~_$",
  },
  dropbox: {
    id: "cx9li9ur8taq1z7",
    secret: "i8f9a1mvx3bijrt",
  },
};

parameters_.prod = {
  oneDrive: {
    id: "e09fc0de-c958-424f-83a2-e56a721d331b",
    secret: "JA3cwsqSGHFtjMwd5XoF5L5",
  },
  oneDriveDemo: {
    id: "606fd4d7-4dfb-4310-b8b7-a47d96aa22b6",
    secret: "qabchuPYL7931$ePDEQ3~_$",
  },
  dropbox: {
    id: "m044w3cvmxhzvop",
    secret: "r298deqisz0od56",
  },
};

async function main() {
  // path to sqlite database file
  const path = "/sample_app/Storage/database1";
  // onedrive auth token
  const token = "some token here";

  // const db = initDb(path);
  const db: any = null;
  const syncTarget = new SyncTargetOneDrive(db, parameters_.prod.oneDrive);
  const isAuth = await syncTarget.isAuthenticated();
  console.log(isAuth);
  syncTarget.api().execTokenRequest();

  //   syncTarget.initFileApi();
  //   syncTarget.initSynchronizer();
  //   syncTarget.synchronizer().then((syncer) => syncer.start());
}

console.log("Starting app...");
main();
