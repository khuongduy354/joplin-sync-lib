import FsDriverBase, { Stat, ReadDirStatsOptions } from "./FsDriverBase";

/**
 * Browser-compatible FsDriver that doesn't use Node.js fs module
 * This driver is minimal and intended for browser environments
 * where filesystem operations are not available
 */
export default class FsDriverBrowser extends FsDriverBase {
  public async stat(path: string): Promise<Stat> {
    throw new Error(
      "Filesystem operations not supported in browser environment",
    );
  }

  public async readFile(path: string, encoding = "utf8"): Promise<any> {
    throw new Error(
      "Filesystem operations not supported in browser environment",
    );
  }

  public async appendFile(
    path: string,
    content: any,
    encoding = "utf8",
  ): Promise<void> {
    throw new Error(
      "Filesystem operations not supported in browser environment",
    );
  }

  public async writeFile(
    path: string,
    content: any,
    encoding = "utf8",
  ): Promise<void> {
    throw new Error(
      "Filesystem operations not supported in browser environment",
    );
  }

  public async move(oldPath: string, newPath: string): Promise<void> {
    throw new Error(
      "Filesystem operations not supported in browser environment",
    );
  }

  public async copy(source: string, dest: string): Promise<void> {
    throw new Error(
      "Filesystem operations not supported in browser environment",
    );
  }

  public async exists(path: string): Promise<boolean> {
    return false;
  }

  public async mkdir(path: string): Promise<void> {
    throw new Error(
      "Filesystem operations not supported in browser environment",
    );
  }

  public async unlink(path: string): Promise<void> {
    throw new Error(
      "Filesystem operations not supported in browser environment",
    );
  }

  public async readDirStats(
    path: string,
    options?: ReadDirStatsOptions,
  ): Promise<Stat[]> {
    throw new Error(
      "Filesystem operations not supported in browser environment",
    );
  }

  public async open(path: string, mode: string): Promise<any> {
    throw new Error(
      "Filesystem operations not supported in browser environment",
    );
  }

  public async close(handle: any): Promise<void> {
    throw new Error(
      "Filesystem operations not supported in browser environment",
    );
  }

  public async readFileChunk(
    handle: any,
    length: number,
    encoding = "utf8",
  ): Promise<any> {
    throw new Error(
      "Filesystem operations not supported in browser environment",
    );
  }

  public async remove(path: string): Promise<void> {
    throw new Error(
      "Filesystem operations not supported in browser environment",
    );
  }

  public resolve(...paths: string[]): string {
    return paths.join("/");
  }

  public async md5File(path: string): Promise<string> {
    throw new Error(
      "Filesystem operations not supported in browser environment",
    );
  }

  public async tarExtract(options: any): Promise<void> {
    throw new Error(
      "Filesystem operations not supported in browser environment",
    );
  }

  public async tarCreate(options: any, filePaths: string[]): Promise<void> {
    throw new Error(
      "Filesystem operations not supported in browser environment",
    );
  }
}
