import BaseItem from "@joplin/lib/models/BaseItem";
import {
  afterAllCleanUp,
  setupDatabaseAndSynchronizer,
  synchronizer,
} from "../test-utils";
import time from "../../helpers/time";
import { loadClasses } from "../../helpers/main_helper";

describe("Synchronizer.basics", () => {
  beforeEach(async () => {
    loadClasses(); // override default joplin methods
    await setupDatabaseAndSynchronizer(1);
    await setupDatabaseAndSynchronizer(2);

    console.log("initializing sync info version 3...");
    const migrationHandler1 = synchronizer(1).migrationHandler();
    await migrationHandler1.initSyncInfo3();

    console.log("finished initializing sync info version 3");
    synchronizer().testingHooks_ = [];
  });

  afterAll(async () => {
    await afterAllCleanUp();
  });

  it("should upload/create and pull item", async () => {
    const note = {
      type_: 1,
      id: "asds",
      title: "un",
      parent_id: "parent id",
      body: "body",
    };

    const syncer = synchronizer(1);
    const res = await syncer.createItems({ items: [note] });

    // get by id
    let remote = await syncer.getItem({ id: res.createdIds[0] });

    // get by path
    const path = BaseItem.systemPath(res.createdIds[0]);
    const remoteByPath = await syncer.getItem({ path });

    // both must yield same result
    expect(!!remote).toBe(true);
    expect(remoteByPath).toBe(remote);

    // check if remote item is the same as the one uploaded
    remote = await BaseItem.unserialize(remote);
    expect(remote.title).toBe(note.title);
    expect(remote.body).toBe(note.body);
    expect(remote.id).toBe(res.createdIds[0]);
  });

  it("should update remote items", async () => {
    const syncer = synchronizer(1);
    const note = {
      type_: 1,
      id: "<id>",
      title: "hello",
      parent_id: "parent id",
      body: "body before update",
    };

    const res = await syncer.createItems({ items: [note] });

    const note2 = {
      type_: 1,
      id: res.createdIds[0],
      title: "hello 2",
      parent_id: "parent id",
      body: "body after update",
    };

    const item = await syncer.getItem({
      id: res.createdIds[0],
      unserializeItem: true,
    });
    console.log("item to be updated: ", item);

    const res2 = await syncer.updateItem({
      item: note2,
      lastSync: item.updated_time,
    });

    expect(res2.status).toBe("success");
    expect(res2.newItem.title).toBe(note2.title);
    expect(res2.newItem.body).toBe(note2.body);
  });

  it("should pull all remote items metadata", async () => {
    // upload 1 note
    const note = {
      type_: 1,
      id: "asds",
      title: "un",
      parent_id: "parent id",
    };
    const syncer = synchronizer(1);
    const res = await syncer.createItems({ items: [note] });

    // pull and check if the created is included
    const expectedPath = res.createdIds[0] + ".md";
    const allItems = await syncer.getItemsMetadata();

    // first file should always be info.json
    expect(allItems.items.length).toBe(2);
    expect(allItems.items[1].path).toBe(expectedPath);
  });

  it("should pull remote items metadata based on delta algorithm", async () => {
    // upload 2 note
    const note = {
      type_: 1,
      id: "asds",
      title: "un",
      parent_id: "parent id",
      updated_time: time.IsoToUnixMs("2024-06-14T02:31:45.188Z"), // this is newer, 14 June
    };

    const note2 = {
      type_: 1,
      id: "asds",
      title: "un",
      parent_id: "parent id",
      updated_time: time.IsoToUnixMs("2024-06-01T02:31:45.188Z"), // this is older, 1 June
    };
    const syncer = synchronizer(1);
    const res = await syncer.createItems({ items: [note, note2] });

    // pull all files
    let allItems = await syncer.getItemsMetadata();
    expect(allItems.items.length).toBe(3);

    // pull a file that is 10 minutes ahead of now
    const timestamp = Date.now() + 10 * 60 * 1000;
    allItems = await syncer.getItemsMetadata({ context: { timestamp } });

    expect(allItems.items.length).toBe(0); // no new items should be pulled
  });
});
