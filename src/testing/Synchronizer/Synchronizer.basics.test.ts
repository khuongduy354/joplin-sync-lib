import Setting from "@joplin/lib/models/Setting";
import Folder from "@joplin/lib/models/Folder";
import Note from "@joplin/lib/models/Note";
import BaseItem from "@joplin/lib/models/BaseItem";
import { NoteEntity } from "@joplin/lib/services/database/types";
import { ErrorCode } from "@joplin/lib/errors";

import {
  allNotesFolders,
  remoteNotesAndFolders,
  localNotesFoldersSameAsRemote,
} from "./test-utils-synchronizer";
import {
  afterAllCleanUp,
  setupDatabaseAndSynchronizer,
  fileApi,
  synchronizer,
} from "../test-utils copy";
import WelcomeUtils from "@joplin/lib/WelcomeUtils";
import {
  fetchSyncInfo,
  setAppMinVersion,
  uploadSyncInfo,
} from "../../Synchronizer/syncInfoUtils";
import {
  serializeModel,
  testNoteItem,
  unserializeWithoutSQLite,
} from "../../helpers/item";
import MigrationHandler from "../../Synchronizer/MigrationHandler";
import time from "../../helpers/time";
import BaseModel from "@joplin/lib/BaseModel";

describe("Synchronizer.basics", () => {
  beforeEach(async () => {
    await setupDatabaseAndSynchronizer(1);
    await setupDatabaseAndSynchronizer(2);

    console.log("initializing sync info version 3...");
    const migrationHandler1 = synchronizer(1).migrationHandler();
    await migrationHandler1.initSyncInfo3();

    console.log("finished initializing sync info version 3");
    // await switchClient(1);
    synchronizer().testingHooks_ = [];
  });

  afterAll(async () => {
    await afterAllCleanUp();
  });

  it("should upload remote and pull item", async () => {
    // const folder = await Folder.save({ title: "folder1" });
    // await Note.save({ title: "un", parent_id: folder.id });

    // const all = await allNotesFolders();
    const initNoteHack = () => {
      // TODO: quick hack
      Note.fieldNames = (withPrefix: boolean = false) => {
        return [
          "id",
          "title",
          "body",
          // TODO: fix time here
          "created_time",
          "updated_time",
          "user_updated_time",
          "user_created_time",
          "encryption_cipher_text",
          "encryption_applied",
          "markup_language",
          "is_shared",
          "source",
          "source_application",
          "application_data",
          "order",
          "latitude",
          "longitude",
          "altitude",
          "author",
          "source_url",
          "is_todo",
          "todo_due",
          "todo_completed",
          "is_conflict",
          "user_data",
          "deleted_time",
          "type_",
          "parent_id",
          "is_conflict",
          "share_id",
          "conflict_original_id",
          "master_key_id",
        ];
      };

      BaseItem.serialize = serializeModel;

      BaseItem.loadClass("Note", Note);
      BaseItem.unserialize = unserializeWithoutSQLite;
    };

    initNoteHack();
    const note = testNoteItem();

    const syncer = synchronizer(1);
    const res = await syncer.createItems({ items: [note] });

    // get by id
    const remote = await syncer.getItem({ id: res.createdIds[0] });

    // get by path
    const path = BaseItem.systemPath(res.createdIds[0]);
    const remoteByPath = await syncer.getItem({ path });

    expect(!!remote).toBe(true);
    expect(remoteByPath).toBe(remote); // get by path or id should return the same item
    const expectedRemoteContent = `Test sync note

    Test sync note body
    
    id: ${res.createdIds[0]}
    created_time: 
    updated_time: 
    user_updated_time: 
    user_created_time: 
    encryption_cipher_text: 
    encryption_applied: 0
    markup_language: 1
    is_shared: 0
    source: joplin-desktop
    source_application: net.cozic.joplin-desktop
    application_data: 
    order: 0
    latitude: 10.7578263
    longitude: 106.7012968
    altitude: 0
    author: 
    source_url: 
    is_todo: 1
    todo_due: 0
    todo_completed: 0
    is_conflict: 0
    user_data: 
    deleted_time: 0
    type_: 1
    parent_id: 1b0663e319074c0cbd966678dabde0b8
    is_conflict: 0
    share_id: 
    conflict_original_id: 
    master_key_id: 
    type_: 1`;

    expect(remote.replace(/ /g, "")).toBe(
      expectedRemoteContent.replace(/ /g, "")
    );

    // TODO: unserializer note content
    // let remoteContent = await fileApi().get(path);
    // const remoteContent = await Note.unserialize(remote);

    // expect(remoteContent.title).toBe(note.title);
    // expect(remoteContent.body).toBe(note.body);
    // expect(remoteContent.id).toBe(note.id);
    // await localNotesFoldersSameAsRemote([note], remoteNote);
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

    // providing the latest lastSync timestamp possible means a force update
    const res2 = await syncer.updateItem({
      item: note2,
      lastSync: time.unixMs(),
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

    //  pull the newer note above
    // const timestamp2 = time.IsoToUnixMs("2024-06-10T02:31:45.188Z"); // 10 June
    // console.log("timestamp2", timestamp2);

    // allItems = await syncer.getItemsMetadata({
    //   context: { timestamp: timestamp2 },
    // });
    // expect(allItems.items.length).toBe(1); // only the newer note should be pulled
    // expect(allItems.items[0].path).toBe(res.createdIds[0] + ".md");
  });
});
