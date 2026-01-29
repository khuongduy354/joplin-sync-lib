// Export main API
export { StorageAPI } from "./StorageAPI/StorageAPI";

// Export sync targets
export { default as JoplinServerSyncTarget } from "./SyncTarget/JoplinServerSyncTarget";
export { FileSystemSyncTarget } from "./SyncTarget/FileSystemSyncTarget";
export { MemorySyncTarget } from "./SyncTarget/MemorySyncTarget";
export { default as WebDAVSyncTarget } from "./SyncTarget/WebDAVSyncTarget";
export { default as OneDriveSyncTarget } from "./SyncTarget/OneDriveSyncTarget";
export { default as GoogleDriveSyncTarget } from "./SyncTarget/GoogleDriveSyncTarget";

// Export synchronizer
export { default as Synchronizer } from "./Synchronizer/Synchronizer";

// Export helpers
export * from "./helpers";

// Export types
// Export types
export * from "./types/apiIO";
// export { Item } from "./types/item";
export * from "./types/item";

// Register models
import BaseItem from "./joplin-lib-mock/models/BaseItem";
import Note from "./joplin-lib-mock/models/Note";
import Folder from "./joplin-lib-mock/models/Folder";
import Resource from "./joplin-lib-mock/models/Resource";
import Tag from "./joplin-lib-mock/models/Tag";
import NoteTag from "./joplin-lib-mock/models/NoteTag";
import MasterKey from "./joplin-lib-mock/models/MasterKey";
import Revision from "./joplin-lib-mock/models/Revision";

BaseItem.loadClass("Note", Note);
BaseItem.loadClass("Folder", Folder);
BaseItem.loadClass("Resource", Resource);
BaseItem.loadClass("Tag", Tag);
BaseItem.loadClass("NoteTag", NoteTag);
BaseItem.loadClass("MasterKey", MasterKey);
BaseItem.loadClass("Revision", Revision);

// Export Logger
export { default as Logger, LogLevel } from "./joplin-lib-mock/Logger";
