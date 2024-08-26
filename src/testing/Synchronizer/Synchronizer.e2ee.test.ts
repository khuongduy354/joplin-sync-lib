import {
  afterAllCleanUp,
  setupDatabaseAndSynchronizer,
  synchronizer,
} from "../test-utils";
import time from "../../helpers/time";
import {
  addE2EInfoToSyncInfo,
  createUUID,
  loadClasses,
} from "../../helpers/item";
import EncryptionService, {
  EncryptionMethod,
} from "@joplin/lib/services/e2ee/EncryptionService";
import { SyncInfoValuePublicPrivateKeyPair } from "@joplin/lib/services/synchronizer/syncInfoUtils";
import { Item } from "../../types/item";
import { SyncInfo } from "../../Synchronizer/syncInfoUtils";

describe("Synchronizer.e2ee", () => {
  beforeEach(async () => {
    loadClasses(); // override default joplin methods
    await setupDatabaseAndSynchronizer(1);
    await setupDatabaseAndSynchronizer(2);

    console.log("initializing sync info version 3...");
    await synchronizer(1).migrationHandler().initSyncInfo3();
    await synchronizer(2).migrationHandler().initSyncInfo3();

    console.log("finished initializing sync info version 3");
  });

  afterAll(async () => {
    await afterAllCleanUp();
  });

  it("items should be encrypted in CREATE operation if e2e is enabled", async () => {
    const syncer = synchronizer(2);

    // create masterkey
    const e2eService = new EncryptionService();
    let mk = await e2eService.generateMasterKey("123456", {
      encryptionMethod: EncryptionMethod.SJCL2,
    });
    mk.id = createUUID();
    e2eService.loadMasterKey(mk, "123456");

    // create e2e info
    const e2eInfo = {
      e2ee: true,
      ppk: {
        publicKey: "asd",
        privateKey: {
          encryptionMethod: EncryptionMethod.Custom,
          ciphertext: "asdsa",
        },
        keySize: 1,
        createdTime: 123,
        id: "sadsa",
      },
      activeMasterKeyId: mk.id,
    };

    // enable remote e2e
    let syncInfo = new SyncInfo();
    syncInfo.version = 3;
    await syncer
      .api()
      .put(
        "info.json",
        JSON.stringify(addE2EInfoToSyncInfo(e2eInfo, syncInfo))
      );

    // enable local e2e
    syncer.setEncryptionService(e2eService);
    const res = await syncer.setupE2E(e2eInfo);

    // CREATE items, should be encrypted
    const note = {
      type_: 1,
      id: "asds",
      overrideId: "this is the chosen id",
      title: "un",
      parent_id: "parent id",
      body: "body",
      is_todo: false,
      overrideCreatedTime: time.unixMs(),
    };
    await syncer.createItems({ items: [note] });
    let item = (await syncer.getItem({
      id: note.id,
      unserializeItem: true,
    })) as Item;
    expect(!!item.encryption_applied).toBe(true);
    expect(!!item.encryption_cipher_text).toBe(true);
  });

  it("items should be encrypted in UPDATE operation if e2e is enabled", async () => {
    const syncer = synchronizer(1);

    // CREATE items, should be unencrypted
    const note = {
      type_: 1,
      id: "asds",
      overrideId: "this is the chosen id",
      title: "un",
      parent_id: "parent id",
      body: "body",
      is_todo: false,
      overrideCreatedTime: time.unixMs(),
    };
    await syncer.createItems({ items: [note] });
    let item = (await syncer.getItem({
      id: note.id,
      unserializeItem: true,
    })) as Item;
    expect(!!item.encryption_applied).toBe(false);
    expect(!!item.encryption_cipher_text).toBe(false);

    // create masterkey
    const e2eService = new EncryptionService();
    let mk = await e2eService.generateMasterKey("123456", {
      encryptionMethod: EncryptionMethod.SJCL2,
    });
    mk.id = createUUID();
    e2eService.loadMasterKey(mk, "123456");

    // create e2e infos
    const e2eInfo = {
      e2ee: true,
      ppk: {
        publicKey: "asd",
        privateKey: {
          encryptionMethod: EncryptionMethod.Custom,
          ciphertext: "asdsa",
        },
        keySize: 1,
        createdTime: 123,
        id: "sadsa",
      },
      activeMasterKeyId: mk.id,
    };

    // enable remote e2e
    let syncInfo = new SyncInfo();
    syncInfo.version = 3;
    await syncer
      .api()
      .put(
        "info.json",
        JSON.stringify(addE2EInfoToSyncInfo(e2eInfo, syncInfo))
      );

    // enable local e2e
    syncer.setEncryptionService(e2eService);
    const res = await syncer.setupE2E(e2eInfo);

    // update item, should be encrypted
    await syncer.updateItem({
      item: note,
      lastSync: note.overrideCreatedTime,
    });
    item = (await syncer.getItem({
      id: note.id,
      unserializeItem: true,
    })) as Item;
    expect(!!item.encryption_applied).toBe(true);
    expect(!!item.encryption_cipher_text).toBe(true);
  });

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
      e2ee: false,
    };

    // compare e2e states
    const res = await syncer.setupE2E(localInfo);
    expect(res.status).toBe("succeeded");
    expect(res.message).toBe("Sync info verified with disabled encryption");
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
      e2ee: false,
    };

    // compare e2e states
    const res = await syncer.setupE2E(localInfo);
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
      e2ee: true,
    };

    // compare e2e states
    const res = await syncer.setupE2E(localInfo);
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
      e2ee: true,
      ppk: ppk.value,
    };

    // compare e2e states
    const res = await syncer.setupE2E(localInfo);
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
      e2ee: true,
      ppk: ppkLocal.value,
    };

    // compare e2e states
    const res = await syncer.setupE2E(localInfo);
    expect(res.status).toBe("aborted");
    expect(res.message).toBe(
      "There's a change in encryption key (ppk) settings, please fetch and update your e2e input to match the remote's"
    );
  });
});
