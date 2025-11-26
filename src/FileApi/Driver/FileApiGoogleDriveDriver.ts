import moment from "moment";
import { basicDelta } from "../FileApi";
import { dirname, basename } from "@joplin/lib/path-utils";
import { singleton } from "../../singleton";
import { Buffer } from "buffer";

class FileApiDriverGoogleDrive {
  private api_: any;
  private pathCache_: Record<string, any>;
  private fileIdCache_: Record<string, string>; // path -> fileId mapping
  protected fileApi_: any;

  constructor(api: any) {
    this.api_ = api;
    this.pathCache_ = {};
    this.fileIdCache_ = {};
  }

  api() {
    return this.api_;
  }

  /**
   * Convert Google Drive file object to our standard format
   */
  makeItem_(gdFile: any) {
    const output: any = {
      path: gdFile.name,
      isDir: gdFile.mimeType === "application/vnd.google-apps.folder",
    };

    if (gdFile.trashed) {
      output.isDeleted = true;
    } else {
      output.updated_time = Number(moment(gdFile.modifiedTime).format("x"));
    }

    // Store file ID for later use
    if (gdFile.id) {
      this.fileIdCache_[gdFile.name] = gdFile.id;
    }

    return output;
  }

  makeItems_(gdFiles: any[]) {
    const output = [];
    for (let i = 0; i < gdFiles.length; i++) {
      output.push(this.makeItem_(gdFiles[i]));
    }
    return output;
  }

  /**
   * Get file ID from path (filename)
   * Google Drive files are identified by ID, not path
   */
  async getFileIdByName_(name: string): Promise<string | null> {
    // Check cache first
    if (this.fileIdCache_[name]) {
      return this.fileIdCache_[name];
    }

    // Search for file in appDataFolder
    try {
      const response = await this.api_.listFiles("appDataFolder", null, 1);
      const files = response.files || [];

      for (const file of files) {
        if (file.name === name) {
          this.fileIdCache_[name] = file.id;
          return file.id;
        }
      }
    } catch (error) {
      return null;
    }

    return null;
  }

  async stat(path: string) {
    try {
      const fileId = await this.getFileIdByName_(path);
      if (!fileId) return null;

      const file = await this.api_.getFileMetadata(fileId);
      return this.makeItem_(file);
    } catch (error: any) {
      if (error.code === 404) return null;
      throw error;
    }
  }

  async setTimestamp(path: string, timestamp: number) {
    const fileId = await this.getFileIdByName_(path);
    if (!fileId) throw new Error(`File not found: ${path}`);

    // Google Drive doesn't support direct timestamp modification
    // This is a deprecated operation anyway
    const file = await this.api_.getFileMetadata(fileId);
    return this.makeItem_(file);
  }

  async list(path: string = "", options: any = null) {
    options = { context: null, ...options };

    let pageToken = options.context || null;
    const pageSize = 1000;

    // For Google Drive, path is ignored - we always work in appDataFolder
    const response = await this.api_.listFiles(
      "appDataFolder",
      pageToken,
      pageSize
    );

    const items = this.makeItems_(response.files || []);

    return {
      hasMore: !!response.nextPageToken,
      items: items,
      context: response.nextPageToken,
    };
  }

  async get(path: string, options: any = null) {
    if (!options) options = {};

    try {
      const fileId = await this.getFileIdByName_(path);
      if (!fileId) return null;

      const response = await this.api_.downloadFile(fileId, options);

      if (options.target === "file") {
        return response;
      } else {
        return await response.text();
      }
    } catch (error: any) {
      if (error.code === 404) return null;
      throw error;
    }
  }

  async mkdir(path: string) {
    // Check if folder already exists
    let item = await this.stat(path);
    if (item) return item;

    // Create folder in appDataFolder
    const folder = await this.api_.createFolder(path, "appDataFolder");
    return this.makeItem_(folder);
  }

  async put(path: string, content: any, options: any = null) {
    if (!options) options = {};

    let byteSize = null;
    let fileContent = content;

    // Determine file size and prepare content
    if (options.source === "file") {
      byteSize = (await singleton.fsDriver().stat(options.path)).size;
      // For file source, we'll need to read it
      // This is simplified - production should use streaming
      fileContent = await singleton.fsDriver().readFile(options.path, "utf8");
    } else {
      if (typeof content === "string") {
        byteSize = Buffer.byteLength(content);
      } else {
        byteSize = content.length;
      }
    }

    // Check if file exists
    const fileId = await this.getFileIdByName_(path);

    if (fileId) {
      // Update existing file
      const result = await this.api_.updateFile(
        fileId,
        fileContent,
        options.headers?.["Content-Type"] || "text/plain",
        options
      );
      return result;
    } else {
      // Create new file
      const result = await this.api_.uploadFile(
        path,
        fileContent,
        options.headers?.["Content-Type"] || "text/plain",
        "appDataFolder",
        options
      );
      this.fileIdCache_[path] = result.id;
      return result;
    }
  }

  async delete(path: string) {
    const fileId = await this.getFileIdByName_(path);
    if (!fileId) {
      // File doesn't exist, nothing to delete
      return;
    }

    await this.api_.deleteFile(fileId);

    // Clear from cache
    delete this.fileIdCache_[path];
  }

  async move(oldPath: string, newPath: string) {
    // Google Drive doesn't have a direct "move" in appDataFolder
    // We need to download, re-upload with new name, and delete old

    const content = await this.get(oldPath);
    if (content === null) {
      throw new Error(`Source file not found: ${oldPath}`);
    }

    await this.put(newPath, content);
    await this.delete(oldPath);
  }

  format() {
    throw new Error("format() not implemented for Google Drive driver");
  }

  async clearRoot() {
    // Delete all files in appDataFolder
    let hasMore = true;
    let context = null;

    while (hasMore) {
      const result = await this.list("", { context });

      for (const item of result.items) {
        if (!item.isDeleted) {
          await this.delete(item.path);
        }
      }

      hasMore = result.hasMore;
      context = result.context;
    }
  }

  async delta(path: string, options: any = null) {
    // Google Drive doesn't have a native delta API for appDataFolder
    // Use basicDelta with list operation
    const getDirStats = async (path: string) => {
      let items: any[] = [];
      let context = null;

      while (true) {
        const result = await this.list(path, {
          includeDirs: false,
          context: context,
        });
        items = items.concat(result.items);
        context = result.context;
        if (!result.hasMore) break;
      }

      return items;
    };

    return await basicDelta(path, getDirStats, options);
  }
}

export { FileApiDriverGoogleDrive };
