// Conditional import based on environment
let FsDriver: any;
let isBrowser = false;

try {
  // Check if we're in a browser environment
  if (typeof window !== "undefined" && typeof process === "undefined") {
    isBrowser = true;
  }
} catch (e) {
  // In case of any error, assume browser
  isBrowser = true;
}

if (isBrowser) {
  // Use browser-compatible driver
  const {
    default: FsDriverBrowser,
  } = require("./FileApi/Driver/FsDriver/FsDriverBrowser");
  FsDriver = FsDriverBrowser;
} else {
  // Use Node.js driver
  const {
    default: FsDriverNode,
  } = require("./FileApi/Driver/FsDriver/FsDriverNode");
  FsDriver = FsDriverNode;
}

class SingleTon {
  private fsDriver_: any;
  appVersion() {
    // TODO: versioning
    return 1;
  }
  fsDriver(): any {
    if (!this.fsDriver_) {
      this.fsDriver_ = new FsDriver();
    }
    return this.fsDriver_;
  }
}

export const singleton = new SingleTon();
