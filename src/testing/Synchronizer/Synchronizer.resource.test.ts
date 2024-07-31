import BaseItem from "@joplin/lib/models/BaseItem";
import {
  afterAllCleanUp,
  setupDatabaseAndSynchronizer,
  synchronizer,
} from "../test-utils";
import { loadClasses } from "../../helpers/item";
import path from "path";
import resourceRemotePath from "@joplin/lib/services/synchronizer/utils/resourceRemotePath";

describe("Synchronizer.resource", () => {
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

  const samplePngResource = () => {
    let localResourceContentPath =
      "./src/sample_app/Storage/resource/image.png";
    localResourceContentPath = path.resolve(localResourceContentPath);
    const sample = {
      localResourceContentPath, // this is new, absolute path to resource
      title: "image.png",
      id: "any",
      mime: "image/png",
      filename: "",
      created_time: "2024-06-14T02:31:45.188Z",
      updated_time: "2024-06-14T02:31:45.188Z",
      user_created_time: "2024-06-14T02:31:45.188Z",
      user_updated_time: "2024-06-14T02:31:45.188Z",
      file_extension: "png",
      encryption_cipher_text: "",
      encryption_applied: 0,
      encryption_blob_encrypted: 0, // switch to 1 for encrypted
      size: 331388,
      is_shared: 0,
      share_id: "",
      master_key_id: "",
      user_data: "",
      blob_updated_time: 1718332305188,
      ocr_text: "",
      ocr_details: "",
      ocr_status: 0,
      ocr_error: "",
      type_: 4,
    };

    return sample;
  };
  it("should create new resource with blobs and metadata", async () => {
    const resource = samplePngResource();

    const syncer = synchronizer(1);
    const res = await syncer.createItems({ items: [resource] });

    // check if resource available
    let remote = await syncer.getItem({ id: res.createdItems[0].id });
    expect(!!remote).toBe(true);

    // check if remote item is the same as the one uploaded
    remote = await BaseItem.unserialize(remote);
    expect(remote.title).toBe(resource.title);
    expect(remote.id).toBe(res.createdItems[0].id);

    // check if blob is available
    const resourcePath = resourceRemotePath(res.createdItems[0].id);
    const blob = await syncer.getItem({ path: resourcePath });
    expect(!!blob).toBe(true);
  });

  it("should delete blobs and metadata", async () => {
    const resource = samplePngResource();

    const syncer = synchronizer(1);
    const res = await syncer.createItems({ items: [resource] });

    // check if resource && blob available
    let remote = await syncer.getItem({ id: res.createdItems[0].id });
    let resourcePath = resourceRemotePath(res.createdItems[0].id);
    let blob = await syncer.getItem({ path: resourcePath });
    expect(!!blob).toBe(true);
    expect(!!remote).toBe(true);

    // delete the resource
    const res2 = await syncer.deleteItems({
      deleteItems: [{ id: res.createdItems[0].id }],
    });

    expect(res2.length).toBe(1);
    expect(res2[0].status).toBe("succeeded");

    // check if resource && blob is deleted
    remote = await syncer.getItem({ id: res.createdItems[0].id });
    resourcePath = resourceRemotePath(res.createdItems[0].id);
    blob = await syncer.getItem({ path: resourcePath });
    expect(!!remote).toBe(false);
    expect(!!blob).toBe(false);
  });
});
