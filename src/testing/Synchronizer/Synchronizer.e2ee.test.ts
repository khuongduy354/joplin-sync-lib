import BaseItem from "@joplin/lib/models/BaseItem";
import {
  afterAllCleanUp,
  setupDatabaseAndSynchronizer,
  synchronizer,
} from "../test-utils";
import time from "../../helpers/time";
import { loadClasses } from "../../helpers/item";
import { MemorySyncTarget } from "../../SyncTarget/MemorySyncTarget";
import { PublicPrivateKeyPair } from "@joplin/lib/services/e2ee/ppk";
import { EncryptionMethod } from "@joplin/lib/services/e2ee/EncryptionService";
import { SyncTargetInfo } from "@joplin/lib/SyncTargetRegistry";
import { SyncInfoValuePublicPrivateKeyPair } from "@joplin/lib/services/synchronizer/syncInfoUtils";

describe("Synchronizer.e2ee", () => {
  beforeEach(async () => {
    loadClasses(); // override default joplin methods
    await setupDatabaseAndSynchronizer(1);
    // await setupDatabaseAndSynchronizer(2);

    console.log("initializing sync info version 3...");
    const migrationHandler1 = synchronizer(1).migrationHandler();
    await migrationHandler1.initSyncInfo3();

    console.log("finished initializing sync info version 3");
  });

  afterAll(async () => {
    await afterAllCleanUp();
  });

  // it("items should be encrypted in CREATE operation if e2e is enabled", async () => {});

  // it("items should be encrypted in UPDATE operation if e2e is enabled", async () => {});

  it("E2E case 1: remote disable, local disable, do nothing", async () => {
    const syncer = synchronizer(1);
    const remoteInfo = JSON.stringify({
      version: 3,
      e2ee: { value: false, updatedTime: time.unixMs() },
    });
    await syncer.api().put("info.json", remoteInfo);
    const info = await syncer.api().get("info.json");
    console.log("info:", info);

    const localInfo = {
      E2E: { e2ee: false },
    };

    const res = await syncer.verifySyncInfo(localInfo);
    expect(res.status).toBe("succeeded");

    const res2 = await syncer.verifySyncInfo(); // assume local disable if not provide E2E info
    expect(res2.status).toBe("succeeded");
  });
  it("E2E case 2.1: remote enable, local disable, prompt user to fetch remote ppk, master keys, and reconfigure local setup to proceed", async () => {
    const syncer = synchronizer(1);
    const remoteInfo = JSON.stringify({
      version: 3,
      e2ee: { value: true, updatedTime: time.unixMs() },
    });
    await syncer.api().put("info.json", remoteInfo);

    const localInfo = {
      E2E: { e2ee: false },
    };

    const res = await syncer.verifySyncInfo(localInfo);
    expect(res.status).toBe("aborted");
    expect(res.remoteInfo.e2ee).toBe(true);
  });
  it("E2E case 2.2: remote disable, local enable, prompt user to fetch remote ppk, master keys, and reconfigure local setup to proceed", async () => {
    const syncer = synchronizer(1);
    const remoteInfo = JSON.stringify({
      version: 3,
      e2ee: { value: false, updatedTime: time.unixMs() },
    });
    await syncer.api().put("info.json", remoteInfo);

    const localInfo = {
      E2E: { e2ee: true },
    };

    const res = await syncer.verifySyncInfo(localInfo);
    expect(res.status).toBe("aborted");
    expect(res.remoteInfo.e2ee).toBe(false);
  });
  it("E2E case 3.1: remote enable, local enable, matched ppk, do nothing ", async () => {
    // preapre ppk
    const ppk: SyncInfoValuePublicPrivateKeyPair = {
      value: {
        id: "id",
        keySize: 10,
        publicKey: "hi",

        privateKey: {
          encryptionMethod: EncryptionMethod.SJCL,
          ciphertext: "helllo",
        },
        createdTime: time.unixMs(),
      },
      updatedTime: time.unixMs(),
    };
    // initialize ppk in remote
    const syncer = synchronizer(1);
    const remoteInfo = JSON.stringify({
      version: 3,
      e2ee: { value: true, updatedTime: time.unixMs() },
      ppk,
    });
    await syncer.api().put("info.json", remoteInfo);

    // compare to local
    const localInfo = {
      E2E: { e2ee: true, ppk: ppk.value },
    };

    const res = await syncer.verifySyncInfo(localInfo);
    expect(res.status).toBe("succeeded");
  });
  it("E2E case 3.2: remote enable, local enable, unmatched ppk, aborts the operation and promp user to provide different ppk", async () => {
    // prepare 2 keypair
    const ppkLocal: SyncInfoValuePublicPrivateKeyPair = {
      value: {
        id: "id",
        keySize: 10,
        publicKey: "hi",

        privateKey: {
          encryptionMethod: EncryptionMethod.SJCL,
          ciphertext: "helllo",
        },
        createdTime: time.unixMs(),
      },
      updatedTime: time.unixMs(),
    };

    const ppkRemote: SyncInfoValuePublicPrivateKeyPair = {
      value: {
        id: "id from remote",
        keySize: 10,
        publicKey: "hi, this is a different pubkey",

        privateKey: {
          encryptionMethod: EncryptionMethod.SJCL,
          ciphertext: "helllo",
        },
        createdTime: time.unixMs(),
      },
      updatedTime: time.unixMs(),
    };

    // initialize ppk in remote
    const syncer = synchronizer(1);
    const remoteInfo = JSON.stringify({
      version: 3,
      e2ee: { value: true, updatedTime: time.unixMs() },
      ppk: ppkRemote,
    });
    await syncer.api().put("info.json", remoteInfo);

    // compare to local
    const localInfo = {
      E2E: { e2ee: true, ppk: ppkLocal.value },
    };

    const res = await syncer.verifySyncInfo(localInfo);
    expect(res.status).toBe("aborted");
  });
});
