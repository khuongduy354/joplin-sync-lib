import FileApiDriverJoplinServer from "../FileApi/Driver/FileApiJoplinServerDriver";
import Synchronizer from "../Synchronizer/Synchronizer";
// import { _ } from "./locale.js";
import JoplinServerApi from "../FileApi/JoplinServerApi";
import { BaseSyncTarget } from "./BaseSyncTarget";
import { FileApi } from "../FileApi/FileApi";
import { AppType, Env } from "@joplin/lib/models/Setting";
// import Logger from "@joplin/utils/Logger";

// const staticLogger = Logger.create("SyncTargetJoplinServer");
const staticLogger = console;

interface FileApiOptions {
  path(): string;
  userContentPath(): string;
  username(): string;
  password(): string;
}

export async function newFileApi(id: number, options: FileApiOptions) {
  const apiOptions = {
    baseUrl: () => options.path(),
    userContentBaseUrl: () => options.userContentPath(),
    username: () => options.username(),
    password: () => options.password(),
    //TODO: setting env
    // env: Setting.value("env"),
    env: Env.Undefined,
  };

  const api = new JoplinServerApi(apiOptions);
  const driver = new FileApiDriverJoplinServer(api);
  const fileApi = new FileApi("", driver);
  fileApi.setSyncTargetId(id);
  await fileApi.initialize();
  return fileApi;
}

export async function initFileApi(
  syncTargetId: number,
  logger: any,
  options: FileApiOptions
) {
  const fileApi = await newFileApi(syncTargetId, options);
  fileApi.setLogger(logger);
  return fileApi;
}

export default class SyncTargetJoplinServer extends BaseSyncTarget {
  public static id() {
    return 9;
  }

  public static supportsConfigCheck() {
    return true;
  }

  public static targetName() {
    return "joplinServer";
  }

  public static description() {
    return "Besides synchronisation and improved performances, Joplin Server also gives access to Joplin-specific sharing features.";
  }

  public static label() {
    return `${"Joplin Server"} (Beta)`;
  }

  public async isAuthenticated() {
    return true;
  }

  public static requiresPassword() {
    return true;
  }

  public static override supportsShare(): boolean {
    return true;
  }

  public async fileApi(): Promise<FileApi> {
    return super.fileApi();
  }

  public static async checkConfig(
    options: FileApiOptions,
    syncTargetId: number = null
  ) {
    const output = {
      ok: false,
      errorMessage: "",
    };

    syncTargetId =
      syncTargetId === null ? SyncTargetJoplinServer.id() : syncTargetId;

    let fileApi = null;
    try {
      fileApi = await newFileApi(syncTargetId, options);
      fileApi.requestRepeatCount_ = 0;
    } catch (error) {
      // If there's an error it's probably an application error, but we
      // can't proceed anyway, so exit.
      output.errorMessage = error.message;
      if (error.code) output.errorMessage += ` (Code ${error.code})`;
      return output;
    }

    // First we try to fetch info.json. It may not be present if it's a new
    // sync target but otherwise, if it is, and it's valid, we know the
    // credentials are valid. We do this test first because it will work
    // even if account upload is disabled. And we need such account to
    // successfully login so that they can fix it by deleting extraneous
    // notes or resources.
    try {
      const r = await fileApi.get("info.json");
      if (r) {
        const parsed = JSON.parse(r);
        if (parsed) {
          output.ok = true;
          return output;
        }
      }
    } catch (error) {
      // Ignore because we'll use the next test to check for sure if it
      // works or not.
      staticLogger.warn("Could not fetch or parse info.json:", error);
    }

    // This is a more generic test, which writes a file and tries to read it
    // back.
    try {
      await fileApi.put("testing.txt", "testing");
      const result = await fileApi.get("testing.txt");
      if (result !== "testing")
        throw new Error(`Could not access data on server "${options.path()}"`);
      await fileApi.delete("testing.txt");
      output.ok = true;
    } catch (error) {
      output.errorMessage = error.message;
      if (error.code) output.errorMessage += ` (Code ${error.code})`;
    }

    return output;
  }

  protected async initFileApi(syncPath: string, options: FileApiOptions) {
    //TODO: users setting
    return initFileApi(SyncTargetJoplinServer.id(), this.logger(), {
      path: () => options.path(),
      userContentPath: () => options.userContentPath(),
      username: () => options.username(),
      password: () => options.password(),
    });
  }

  protected async initSynchronizer() {
    return new Synchronizer(this.db(), await this.fileApi(), AppType.Desktop);
  }
}
