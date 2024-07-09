import { BaseSyncTarget } from "./BaseSyncTarget";
import { FileApi } from "../FileApi/FileApi";
import FileApiDriverLocal from "../FileApi/Driver/FsDriver/file-api-driver-local";
import Synchronizer from "../Synchronizer/Synchronizer";
import { AppType } from "@joplin/lib/models/Setting";

export class FileSystemSyncTarget extends BaseSyncTarget {
  public static id() {
    return 2;
  }

  public static targetName() {
    return "filesystem";
  }

  public static label() {
    return "File system";
  }

  public static unsupportedPlatforms() {
    return ["ios"];
  }

  public async isAuthenticated() {
    return true;
  }

  public async initFileApi(syncPath: string) {
    // const syncPath = "/tmp/joplin-sync-filesystem/";
    const driver = new FileApiDriverLocal();
    const fileApi = new FileApi(syncPath, driver);
    fileApi.setSyncTargetId(FileSystemSyncTarget.id());
    await driver.mkdir(syncPath);
    this.fileApi_ = fileApi;

    return fileApi;
  }

  public async initSynchronizer() {
    return new Synchronizer(this.db(), await this.fileApi(), AppType.Desktop);
  }
}
