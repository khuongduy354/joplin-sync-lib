import { BaseSyncTarget } from "./BaseSyncTarget";
import { FileApi } from "../FileApi/FileApi";
// const FileApiDriverMemory = require("./file-api-driver-memory").default;
import FileApiDriverMemory from "../FileApi/Driver/FileApiMemoryDriver";
import Synchronizer from "../Synchronizer/Synchronizer";
import { AppType } from "@joplin/lib/models/Setting";
import { Dirnames } from "@joplin/lib/services/synchronizer/utils/types";

export class MemorySyncTarget extends BaseSyncTarget {
  static id() {
    return 1;
  }

  static targetName() {
    return "memory";
  }

  static label() {
    return "Memory";
  }

  async isAuthenticated() {
    return true;
  }

  async initFileApi() {
    const fileApi = new FileApi("/root", new FileApiDriverMemory());
    fileApi.setLogger(console);
    fileApi.setSyncTargetId(MemorySyncTarget.id());
    fileApi.setTempDirName(Dirnames.Temp);
    fileApi.initialize();
    this.fileApi_ = fileApi;
    return fileApi;
  }

  async initSynchronizer() {
    return new Synchronizer(
      this.db(),
      await this.fileApi(),
      AppType.Desktop
      //   Setting.value("appType")
    );
  }
}
