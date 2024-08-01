import { FileSystemSyncTarget } from "../SyncTarget/FileSystemSyncTarget";

export async function itemUpdaterDemo() {
  try {
    // init syncer
    const syncPath = "src/sample_app/Storage/fsSyncTarget"; // filesystem sync target
    const synctarget = new FileSystemSyncTarget(null);
    await synctarget.initFileApi(syncPath);
    const syncer = await synctarget.synchronizer();

    // create note 1
    const note1 = {
      type_: 1,
      id: "<id>",
      title: "hello",
      parent_id: "parent id",
      body: "body before update",
    };

    const res = await syncer.createItems({ items: [note1] });

    // attempt to update note 1 to note 2
    const note2 = {
      type_: 1,
      id: res.createdItems[0].id,
      title: "hello 2",
      parent_id: "parent id",
      body: "body after update",
    };

    let item = await syncer.getItem({
      id: res.createdItems[0].id,
      unserializeItem: true,
    });
    console.log("item before update: ", item);

    const res2 = await syncer.updateItem({
      item: note2,
      lastSync: item.updated_time,
    });

    // get updated note
    item = await syncer.getItem({
      id: res.createdItems[0].id,
      unserializeItem: true,
    });

    console.log("updated item: ", item);
  } catch (err) {
    console.error(err);
  }
}
