// Conditional import based on environment
// Use static imports that Vite can tree-shake
import FsDriverBrowser from "./FileApi/Driver/FsDriver/FsDriverBrowser";
// Note: FsDriverNode won't be imported in browser builds due to tree-shaking

let FsDriver: any;
let isBrowser = false;

try {
  // Check if we're in a browser environment
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    isBrowser = true;
  }
} catch (e) {
  // In case of any error, assume Node.js
  isBrowser = false;
}

// Select the appropriate driver
if (isBrowser) {
  // Use browser-compatible driver
  FsDriver = FsDriverBrowser;
} else {
  // Use Node.js driver - will fail in browser but that's okay
  // because this branch won't be reached
  try {
    // This will be tree-shaken out in browser builds
    const { default: FsDriverNode } = require("./FileApi/Driver/FsDriver/FsDriverNode");
    FsDriver = FsDriverNode;
  } catch (e) {
    // Fallback to browser driver if Node driver fails
    FsDriver = FsDriverBrowser;
  }
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
