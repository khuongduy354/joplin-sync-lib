import BaseItem from "@joplin/lib/models/BaseItem";
import {
  afterAllCleanUp,
  setupDatabaseAndSynchronizer,
  synchronizer,
} from "../test-utils";
import { loadClasses } from "../../helpers/item";
import fs from "fs-extra";
import resourceRemotePath from "@joplin/lib/services/synchronizer/utils/resourceRemotePath";
import { samplePngResource } from "../../helpers/item";
import BaseModel from "@joplin/lib/BaseModel";
import { Item } from "../../types/item";

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

  it("should create new resource with blobs and metadata", async () => {
    const resourcePath = "./src/testing/resource/image.png";
    const resource = samplePngResource(resourcePath);

    const syncer = synchronizer(1);
    const res = await syncer.createItems({ items: [resource] });

    // check if resource available
    let remote = (await syncer.getItem({
      id: res.createdItems[0].id,
      unserializeItem: true,
    })) as Item;
    expect(!!remote).toBe(true);

    // check if remote item is the same as the one uploaded
    expect(remote.title).toBe(resource.title);
    expect(remote.id).toBe(res.createdItems[0].id);

    // check if blob is available
    const blob = await syncer.getItem({
      path: resourceRemotePath(res.createdItems[0].id),
    });
    expect(!!blob).toBe(true);
  });

  it("should delete blobs and metadata", async () => {
    const resourcePath = "./src/testing/resource/image.png";
    const resource = samplePngResource(resourcePath);

    const syncer = synchronizer(1);
    const res = await syncer.createItems({ items: [resource] });

    // check if resource && blob available
    let remote = await syncer.getItem({ id: res.createdItems[0].id });
    let resRemotePath = resourceRemotePath(res.createdItems[0].id);
    let blob = await syncer.getItem({ path: resRemotePath });
    expect(!!blob).toBe(true);
    expect(!!remote).toBe(true);

    // delete the resource
    const res2 = await syncer.deleteItems({
      deleteItems: [{ id: res.createdItems[0].id, type_: 4 }],
    });

    expect(res2.length).toBe(1);
    expect(res2[0].status).toBe("succeeded");

    // check if resource && blob is deleted
    remote = await syncer.getItem({ id: res.createdItems[0].id });
    resRemotePath = resourceRemotePath(res.createdItems[0].id);
    let blob2 = await syncer.getItem({ path: resRemotePath });
    expect(!!remote).toBe(false);
    expect(!!blob2).toBe(false);
  });

  it("should upload/download resource with blob", async () => {
    // prep payload
    const resourcePath = "./src/testing/resource/image.png";
    const resource = samplePngResource(resourcePath);

    // upload
    const syncer = synchronizer(1);
    const res = await syncer.createItems({ items: [resource] });

    // ensure resource metadata on remote
    const remoteRes = (await syncer.getItem({
      id: res.createdItems[0].id,
      unserializeItem: true,
    })) as Item;

    expect(remoteRes.id).toBe(res.createdItems[0].id);

    // download blob & compare
    const localPath = "./temp/image.png";
    await syncer.getBlob(res.createdItems[0].id, localPath);
    expect(fs.readFileSync(localPath)).toEqual(fs.readFileSync(resourcePath));

    // cleanup
    fs.unlinkSync(localPath);
    expect(fs.existsSync(localPath)).toBe(false);
  });

  it("should update blob data if specified", async () => {
    // prep payload
    const resourcePath1 = "./src/testing/resource/image.png";
    const resourcePath2 = "./src/testing/resource/joplin-logo.png";
    const resource1 = samplePngResource(resourcePath1);

    // upload
    const syncer = synchronizer(1);
    const res = await syncer.createItems({ items: [resource1] });

    // old blob should be same as path 1
    const localPath = "./temp/image.png";
    await syncer.getBlob(res.createdItems[0].id, localPath);
    const item = await syncer.getItem({ id: res.createdItems[0].id });
    const blob1 = fs.readFileSync(localPath);

    expect(blob1).toEqual(fs.readFileSync(resourcePath1));

    // update blob
    await syncer.updateItem({
      item: {
        id: res.createdItems[0].id,
        type_: BaseModel.TYPE_RESOURCE,
        updateBlob: true,
        localResourceContentPath: resourcePath2,
      },
      lastSync: res.createdItems[0].updated_time,
    });

    // new blob should be the same as path2
    await syncer.getBlob(res.createdItems[0].id, localPath);
    expect(fs.existsSync(localPath)).toBe(true);
    const blob2 = fs.readFileSync(localPath);

    expect(blob2).toEqual(fs.readFileSync(resourcePath2));

    // 2 blob are different, despite fetched from same id
    expect(blob1).not.toEqual(blob2);

    // cleanup
    fs.unlinkSync(localPath);
    expect(fs.existsSync(localPath)).toBe(false);
  });
});
