import { SyncInfo } from "../../Synchronizer/syncInfoUtils";
import { e2eInfo } from "../../types/e2eInfo";

// e2e info and syncInfo helpers
export function addE2EInfoToSyncInfo(
  e2eInfo: e2eInfo,
  syncInfo: SyncInfo
): SyncInfo {
  // reformat info
  const e2eRemoteInfo = {
    e2ee: { value: e2eInfo.e2ee },
    ppk: {
      value: e2eInfo.ppk,
    },
    activeMasterKeyId: {
      value: e2eInfo.activeMasterKeyId,
    },
    masterKeys: [
      {
        id: e2eInfo.activeMasterKeyId,
      },
    ],
  };
  return {
    ...syncInfo.toObject(),
    ...e2eRemoteInfo,
  };
}

export function extractE2EInfoFromSyncInfo(syncInfo: SyncInfo): e2eInfo {
  const e2eInfo = {
    e2ee: syncInfo.e2ee,
    ppk: syncInfo.ppk,
    activeMasterKeyId: syncInfo.activeMasterKeyId,
  };
  return e2eInfo;
}
