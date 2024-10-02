import FsDriverNode from "./FileApi/Driver/FsDriver/FsDriverNode";

class SingleTon {
  private fsDriver_: FsDriverNode;
  appVersion() {
    // TODO: versioning
    return 1;
  }
  fsDriver(): FsDriverNode {
    if (!this.fsDriver_) {
      this.fsDriver_ = new FsDriverNode();
    }
    return this.fsDriver_;
  }
}

export const singleton = new SingleTon();
