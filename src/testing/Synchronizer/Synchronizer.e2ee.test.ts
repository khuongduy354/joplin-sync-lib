import {
  afterAllCleanUp,
  setupDatabaseAndSynchronizer,
  synchronizer,
} from "../test-utils";
import time from "../../helpers/time";
import { loadClasses } from "../../helpers/item";
import { EncryptionMethod } from "@joplin/lib/services/e2ee/EncryptionService";
import { SyncInfoValuePublicPrivateKeyPair } from "@joplin/lib/services/synchronizer/syncInfoUtils";

describe("Synchronizer.e2ee", () => {
  beforeEach(async () => {
    loadClasses(); // override default joplin methods
    await setupDatabaseAndSynchronizer(1);

    console.log("initializing sync info version 3...");
    const migrationHandler1 = synchronizer(1).migrationHandler();
    await migrationHandler1.initSyncInfo3();

    console.log("finished initializing sync info version 3");
  });

  afterAll(async () => {
    await afterAllCleanUp();
  });

  // TODO:e2e encryption test (see origin)
  // it("items should be encrypted in CREATE operation if e2e is enabled", async () => {});

  // it("items should be encrypted in UPDATE operation if e2e is enabled", async () => {});

  it("E2E case 1: remote disable, local disable should prompts succeeded", async () => {
    // init remote
    const syncer = synchronizer(1);
    const remoteInfo = JSON.stringify({
      version: 3,
      e2ee: { value: false, updatedTime: time.unixMs() },
    });
    await syncer.api().put("info.json", remoteInfo);
    const info = await syncer.api().get("info.json");

    // init local
    const localInfo = {
      E2E: { e2ee: false },
    };

    // compare e2e states
    const res = await syncer.verifySyncInfo(localInfo);
    expect(res.status).toBe("succeeded");
    expect(res.message).toBe("Sync info verified with disabled encryption");

    const res2 = await syncer.verifySyncInfo(); // assume local disable if not provide E2E info
    expect(res2.status).toBe("succeeded");
  });
  it("E2E case 2.1: remote enable, local disable should abort the operation and prompt user to fetch and update e2e input", async () => {
    // init remote
    const syncer = synchronizer(1);
    const remoteInfo = JSON.stringify({
      version: 3,
      e2ee: { value: true, updatedTime: time.unixMs() },
    });
    await syncer.api().put("info.json", remoteInfo);

    // init local
    const localInfo = {
      E2E: { e2ee: false },
    };

    // compare e2e states
    const res = await syncer.verifySyncInfo(localInfo);
    expect(res.status).toBe("aborted");
    expect(res.remoteInfo.e2ee).toBe(true);
    expect(res.message).toBe(
      "There's a change in remote encryption settings, please fetch and update your e2e input to match the remote's"
    );
  });

  it("E2E case 2.2: remote disable, local enable should abort the operation and prompt user to fetch and update e2e input", async () => {
    // init remote
    const syncer = synchronizer(1);
    const remoteInfo = JSON.stringify({
      version: 3,
      e2ee: { value: false, updatedTime: time.unixMs() },
    });
    await syncer.api().put("info.json", remoteInfo);

    // init local
    const localInfo = {
      E2E: { e2ee: true },
    };

    // compare e2e states
    const res = await syncer.verifySyncInfo(localInfo);
    expect(res.status).toBe("aborted");
    expect(res.remoteInfo.e2ee).toBe(false);
    expect(res.message).toBe(
      "There's a change in remote encryption settings, please fetch and update your e2e input to match the remote's"
    );
  });
  it("E2E case 3.1: remote enable, local enable, matched ppk should prompts succedeed", async () => {
    // init ppk
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
    // init remote with ppk
    const syncer = synchronizer(1);
    const remoteInfo = JSON.stringify({
      version: 3,
      e2ee: { value: true, updatedTime: time.unixMs() },
      ppk,
    });
    await syncer.api().put("info.json", remoteInfo);

    // init local with ppk
    const localInfo = {
      E2E: { e2ee: true, ppk: ppk.value },
    };

    // compare e2e states
    const res = await syncer.verifySyncInfo(localInfo);
    expect(res.status).toBe("succeeded");
    expect(res.message).toBe("Sync info verified with enabled encryption");
  });
  it("E2E case 3.2: remote enable, local enable, unmatched ppk, should aborts the operation and prompts user to fetch and update e2e input", async () => {
    // init remote
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
    const syncer = synchronizer(1);
    const remoteInfo = JSON.stringify({
      version: 3,
      e2ee: { value: true, updatedTime: time.unixMs() },
      ppk: ppkRemote,
    });

    await syncer.api().put("info.json", remoteInfo);

    // init local
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
    const localInfo = {
      E2E: { e2ee: true, ppk: ppkLocal.value },
    };

    // compare e2e states
    const res = await syncer.verifySyncInfo(localInfo);
    expect(res.status).toBe("aborted");
    expect(res.message).toBe(
      "There's a change in encryption key (ppk) settings, please fetch and update your e2e input to match the remote's"
    );
  });
});
