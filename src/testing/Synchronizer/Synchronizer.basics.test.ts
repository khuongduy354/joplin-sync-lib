import BaseItem from "@joplin/lib/models/BaseItem";
import {
  afterAllCleanUp,
  setupDatabaseAndSynchronizer,
  synchronizer,
} from "../test-utils";
import time from "../../helpers/time";
import { loadClasses } from "../../helpers/item";

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
    let remote = await syncer.getItem({ id: res.createdItems[0].id });

    // get by path
    const path = BaseItem.systemPath(res.createdItems[0].id);
    const remoteByPath = await syncer.getItem({ path });

    // both must yield same result
    expect(!!remote).toBe(true);
    expect(remoteByPath).toBe(remote);

    // check if remote item is the same as the one uploaded
    remote = await BaseItem.unserialize(remote);
    expect(remote.title).toBe(note.title);
    expect(remote.body).toBe(note.body);
    expect(remote.id).toBe(res.createdItems[0].id);
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
      id: res.createdItems[0].id,
      title: "hello 2",
      parent_id: "parent id",
      body: "body after update",
    };

    const item = await syncer.getItem({
      id: res.createdItems[0].id,
      unserializeItem: true,
    });
    console.log("item to be updated: ", item);

    const res2 = await syncer.updateItem({
      item: note2,
      lastSync: item.updated_time,
    });

    expect(res2.status).toBe("succeeded");
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
    const expectedPath = res.createdItems[0].id + ".md";
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
      updated_time: time.IsoToUnixMs("2024-06-14T02:31:45.188Z"),
    };

    const note2 = {
      type_: 1,
      id: "asds",
      title: "un",
      parent_id: "parent id",
      updated_time: time.IsoToUnixMs("2024-06-01T02:31:45.188Z"),
    };
    const syncer = synchronizer(1);
    const res = await syncer.createItems({ items: [note, note2] });

    // pull all files
    let allItems = await syncer.getItemsMetadata();
    expect(allItems.items.length).toBe(3);

    // pull a file that is 10 minutes ahead of now
    const timestamp = time.unixMs() + 10 * 60 * 1000;
    allItems = await syncer.getItemsMetadata({ context: { timestamp } });

    expect(allItems.items.length).toBe(0); // no new items should be pulled
  });

  it("should delete remote items", async () => {
    // create 1 item
    const note = {
      type_: 1,
      id: "asds",
      title: "un",
      parent_id: "parent id",
      body: "body",
    };

    const syncer = synchronizer(1);
    const res = await syncer.createItems({ items: [note] });

    let remote = await syncer.getItem({ id: res.createdItems[0].id });
    expect(!!remote).toBe(true);

    // delete the item
    const res2 = await syncer.deleteItems({
      deleteItems: [{ id: res.createdItems[0].id }],
    });

    expect(res2.length).toBe(1);
    expect(res2[0].status).toBe("succeeded");

    // check if the item is deleted
    remote = await syncer.getItem({ id: res.createdItems[0].id });
    expect(!!remote).toBe(false);
  });

  it("should pull multiple remote items", async () => {
    const note = {
      type_: 1,
      id: "asds",
      title: "un",
      parent_id: "parent id",
      body: "body",
    };
    let items = [];
    for (let i = 0; i < 10; i++) {
      const copy = { ...note };
      copy.id = i.toString();

      items.push(copy);
    }

    const syncer = synchronizer(1);
    const res = await syncer.createItems({ items });

    // get items by id
    let remoteItems = await syncer.getItems({
      ids: items.map((i) => i.id),
      unserializeAll: true,
    });
    expect(remoteItems.length).toBe(10);
    expect(remoteItems[0].type_).toBe(1);
  });
});
