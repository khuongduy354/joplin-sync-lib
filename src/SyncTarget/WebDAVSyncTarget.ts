import { AppType } from "@joplin/lib/models/Setting";
import { BaseSyncTarget } from "./BaseSyncTarget";
import { FileApi } from "../FileApi/FileApi";
import Synchronizer from "../Synchronizer/Synchronizer";
import WebDavApi from "../FileApi/WebDAVApi";
import FileApiDriverWebDav, {
  checkProviderIsSupported,
} from "../FileApi/Driver/FileApiWebDAVDriver";

export interface WebDAVSyncOptions {
  path(): string;
  username(): string;
  password(): string;
  ignoreTlsErrors(): boolean;
}

interface CheckConfigResult {
  ok: boolean;
  errorMessage: string;
}

export default class SyncTargetWebDAV extends BaseSyncTarget {
  public static id(): number {
    return 6;
  }

  public static supportsConfigCheck(): boolean {
    return true;
  }

  public static targetName(): string {
    return "webdav";
  }

  public static label(): string {
    return "WebDAV";
  }

  public static description(): string {
    return "The WebDAV protocol allows users to create, change and move documents on a server. There are many WebDAV compatible servers, including SeaFile, Nginx or Apache.";
  }

  public async isAuthenticated(): Promise<boolean> {
    return true;
  }

  public static requiresPassword(): boolean {
    return true;
  }

  private static async newFileApi_(
    syncTargetId: number,
    options: WebDAVSyncOptions
  ): Promise<any> {
    const apiOptions = {
      baseUrl: () => options.path(),
      username: () => options.username(),
      password: () => options.password(),
      ignoreTlsErrors: () => options.ignoreTlsErrors(),
    };

    const api = new WebDavApi(apiOptions);
    const driver = new FileApiDriverWebDav(api);
    const fileApi = new FileApi("", driver);
    fileApi.setSyncTargetId(syncTargetId);
    return fileApi;
  }

  public static async checkConfig(
    options: WebDAVSyncOptions
  ): Promise<CheckConfigResult> {
    const fileApi = await SyncTargetWebDAV.newFileApi_(
      SyncTargetWebDAV.id(),
      options
    );
    fileApi.requestRepeatCount_ = 0;

    const output = {
      ok: false,
      errorMessage: "",
    };

    try {
      checkProviderIsSupported(options.path());
      const result = await fileApi.stat("");
      if (!result)
        throw new Error(`WebDAV directory not found: ${options.path()}`);
      output.ok = true;
    } catch (error) {
      output.errorMessage = error.message;
      if (error.code) output.errorMessage += ` (Code ${error.code})`;
    }

    return output;
  }

  public async initFileApi(options: WebDAVSyncOptions): Promise<any> {
    const fileApi = await SyncTargetWebDAV.newFileApi_(SyncTargetWebDAV.id(), {
      path: () => options.path(),
      username: () => options.username(),
      password: () => options.password(),
      ignoreTlsErrors: () => options.ignoreTlsErrors(),
    });

    fileApi.setLogger(this.logger());

    return fileApi;
  }

  protected async initSynchronizer(): Promise<any> {
    return new Synchronizer(this.db(), await this.fileApi(), AppType.Desktop);
  }
}
