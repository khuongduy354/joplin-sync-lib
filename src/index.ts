import { mailClient } from "./sample_app/mailClient";
import { OCRService } from "./sample_app/ocrService";
import { newItemListernerDemo } from "./sample_app/newItemListener";
import { itemUpdaterDemo } from "./sample_app/itemUpdaterDemo";
import { loadClasses } from "./helpers/item";
import JoplinServerSyncTarget from "./SyncTarget/JoplinServerSyncTarget";

// driver code
async function main() {
  loadClasses();

  try {
    const syncTarget = new JoplinServerSyncTarget(null);
    const options = {
      username: () => "admin@localhost",
      password: () => "admin",
      path: () => "http://localhost:22300",
      userContentPath: () => "http://localhost:22300",
    };
    await syncTarget.initFileApi(options);
    const syncer = await syncTarget.synchronizer();
    await syncer.initSyncInfo();
    const res = await syncer.createItems({
      items: [
        {
          title: "test",
          body: "test",
          type_: 1,
          overrideId: "test",
          id: "test",
          parent_id: "abcxyz",
        },
      ],
    });
    console.log(res);
    const items = await syncer.getItem({ id: "test" });
    console.log(items);
  } catch (e) {
    console.error(e);
  }
}

main();
