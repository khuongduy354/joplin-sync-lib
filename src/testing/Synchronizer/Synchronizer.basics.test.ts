import BaseItem from "@joplin/lib/models/BaseItem";
import {
  afterAllCleanUp,
  setupDatabaseAndSynchronizer,
  synchronizer,
} from "../test-utils";
import time from "../../helpers/time";
import { createNote, loadClasses } from "../../helpers/item";
import { CreateItem, Item } from "../../types/item";

describe("Synchronizer.basics", () => {
  beforeEach(async () => {
    loadClasses(); // override default joplin methods
    await setupDatabaseAndSynchronizer(1);
    await setupDatabaseAndSynchronizer(2);

    console.log("initializing sync info version 3...");
    await synchronizer(1).initSyncInfo();
    await synchronizer(2).initSyncInfo();

    console.log("finished initializing sync info version 3");
    synchronizer().testingHooks_ = [];
  });

  afterAll(async () => {
    await afterAllCleanUp();
  });

  it("should upload/create and pull item", async () => {
    const note = createNote({
      parent_id: "parent id",
    });

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
    remote = (await BaseItem.unserialize(remote as string)) as Item;
    expect(remote.id).toBe(res.createdItems[0].id);
  });

  it("should throw when upload conflicted items ids", async () => {
    const note: CreateItem = createNote({
      title: "un",
      parent_id: "parent id",
      body: "body",
    });

    note.overrideId = "this is the chosen id";

    const syncer = synchronizer(1);
    const res1 = await syncer.createItems({ items: [note] });
    const res2 = await syncer.createItems({ items: [note] });
    expect(res2.failedItems[0].error.message).toBe(
      "Remote item exists, can't create. "
    );
  });

  it("should update remote items", async () => {
    const syncer = synchronizer(1);
    const note = createNote({
      title: "hello 1",
      parent_id: "parent id",
      body: "body before update",
    });

    const res = await syncer.createItems({ items: [note] });

    const note2 = createNote({
      title: "hello 2",
      parent_id: "parent id",
      body: "body after update",
    });

    const item = (await syncer.getItem({
      id: res.createdItems[0].id,
      unserializeItem: true,
    })) as Item;

    note2.id = res.createdItems[0].id;
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
    const note = createNote({
      parent_id: "parent id",
    });
    const syncer = synchronizer(1);
    const res = await syncer.createItems({ items: [note] });

    // pull and check if the created is included
    const expectedPath = res.createdItems[0].id + ".md";
    const allItems = await syncer.getItemsMetadata();

    // should includes the uploaded item
    expect(allItems.items.some((it) => it.path === expectedPath)).toBe(true);
  });

  it("should pull remote items metadata based on delta algorithm", async () => {
    // upload 2 note
    const note = createNote({
      title: "un",
      parent_id: "parent id",
    });
    note.updated_time = time.IsoToUnixMs("2024-06-14T02:31:45.188Z");

    const note2 = createNote({
      parent_id: "parent id",
    });
    note2.updated_time = time.IsoToUnixMs("2024-06-01T02:31:45.188Z");

    const syncer = synchronizer(1);
    const res = await syncer.createItems({ items: [note, note2] });

    // pull all files
    let allItems = await syncer.getItemsMetadata();
    expect(allItems.items.length >= 2).toBe(true);
    expect(allItems.items.some((it) => it.id === res.createdItems[0].id)).toBe(
      true
    );

    // pull a file that is 10 minutes ahead of now
    const timestamp = time.unixMs() + 10 * 60 * 1000;
    allItems = await syncer.getItemsMetadata({
      context: { timestamp },
    });

    expect(allItems.items.length).toBe(0); // no new items should be pulled
  });

  it("should track deleted items in get items metadata with delta algorithm", async () => {
    // upload 1 note
    const note1 = createNote({
      parent_id: "parent id",
    });
    note1.updated_time = time.IsoToUnixMs("2024-06-14T02:31:45.188Z");

    const syncer = synchronizer(1);
    const res = await syncer.createItems({ items: [note1] });
    const id1 = res.createdItems[0].id;

    // pull all files
    let allItems = await syncer.getItemsMetadata();
    expect(allItems.items.length >= 1).toBe(true);

    await syncer.deleteItems({ deleteItems: [{ id: id1, type_: 0 }] });

    allItems = await syncer.getItemsMetadata({
      context: { trackDeleteItems: true },
      allItemIdsHandler: async () => {
        return [id1];
      },
    });
    expect(allItems.items.length >= 1).toBe(true);
    expect(
      allItems.items.some((it) => it.id === id1 && it.isDeleted === true)
    ).toBe(true);
  });

  it("should delete remote items", async () => {
    // create 1 item
    const note = createNote({
      title: "un",
      parent_id: "parent id",
      body: "body",
    });

    const syncer = synchronizer(1);
    const res = await syncer.createItems({ items: [note] });

    let remote = await syncer.getItem({ id: res.createdItems[0].id });
    expect(!!remote).toBe(true);

    // delete the item
    const res2 = await syncer.deleteItems({
      deleteItems: [{ id: res.createdItems[0].id, type_: 1 }],
    });

    expect(res2.length).toBe(1);
    expect(res2[0].status).toBe("succeeded");

    // check if the item is deleted
    remote = await syncer.getItem({ id: res.createdItems[0].id });
    expect(!!remote).toBe(false);
  });

  it("should pull multiple remote items", async () => {
    const note = createNote({
      title: "un",
      parent_id: "parent id",
      body: "body",
    });
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
