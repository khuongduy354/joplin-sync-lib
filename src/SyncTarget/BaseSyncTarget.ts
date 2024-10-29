import Synchronizer from "../Synchronizer/Synchronizer";
import { logger } from "../helpers/logger";

export interface CheckConfigResult {
  ok: boolean;
  errorMessage: string;
}

export abstract class BaseSyncTarget {
  public static dispatch: Function = () => {};

  private synchronizer_: Synchronizer = null;
  private initState_: any = null;
  private logger_ = logger;
  private options_: any;
  private db_: any;
  protected fileApi_: any;

  public constructor(db: any, options: any = null) {
    this.db_ = db;
    this.options_ = options;
  }

  public static supportsConfigCheck() {
    return false;
  }

  // Returns true if the sync target expects a non-empty sync.{id}.password
  // setting.
  public static requiresPassword() {
    return false;
  }

  public static description(): string {
    return "";
  }

  public static supportsShare(): boolean {
    return false;
  }

  public static supportsSelfHosted(): boolean {
    return true;
  }

  public option(name: string, defaultValue: any = null) {
    return this.options_ && name in this.options_
      ? this.options_[name]
      : defaultValue;
  }

  protected logger() {
    return this.logger_;
  }

  // public setLogger(v: Logger) {
  //   this.logger_ = v;
  // }

  protected db() {
    return this.db_;
  }

  // If [] is returned it means all platforms are supported
  public static unsupportedPlatforms(): any[] {
    return [];
  }

  public async isAuthenticated() {
    return false;
  }

  public authRouteName(): string {
    return null;
  }

  public static id(): number {
    throw new Error("id() not implemented");
  }

  // Note: it cannot be called just "name()" because that's a reserved keyword and
  // it would throw an obscure error in React Native.
  public static targetName(): string {
    throw new Error("targetName() not implemented");
  }

  public static label(): string {
    throw new Error("label() not implemented");
  }

  protected async initSynchronizer(): Promise<Synchronizer> {
    throw new Error("initSynchronizer() not implemented");
  }

  // protected async initFileApi(
  //   syncPath: string,
  //   options: any = {}
  // ): Promise<any> {
  //   throw new Error("initFileApi() not implemented");
  // }

  public async fileApi() {
    if (this.fileApi_) {
      return this.fileApi_;
    } else {
      throw new Error("File API not initialized");
    }
  }

  // Usually each sync target should create and setup its own file API via initFileApi()
  // but for testing purposes it might be convenient to provide it here so that multiple
  // clients can share and sync to the same file api (see test-utils.js)
  public setFileApi(v: any) {
    this.fileApi_ = v;
  }

  public async synchronizer(): Promise<Synchronizer> {
    if (this.synchronizer_) return this.synchronizer_;

    if (this.initState_ === "started") {
      // Synchronizer is already being initialized, so wait here till it's done.
      return new Promise((resolve, reject) => {
        const iid = setInterval(() => {
          if (this.initState_ === "ready") {
            clearInterval(iid);
            resolve(this.synchronizer_);
          }
          if (this.initState_ === "error") {
            clearInterval(iid);
            reject(new Error("Could not initialise synchroniser"));
          }
        }, 1000);
      });
    } else {
      this.initState_ = "started";

      try {
        this.synchronizer_ = await this.initSynchronizer();
        this.synchronizer_.setLogger(this.logger());
        this.synchronizer_.dispatch = BaseSyncTarget.dispatch;
        this.initState_ = "ready";
        return this.synchronizer_;
      } catch (error) {
        this.initState_ = "error";
        throw error;
      }
    }
  }

  public static async checkConfig(_options: any): Promise<CheckConfigResult> {
    throw new Error("CheckConfig Not implemented");
  }

  public async syncStarted() {
    if (!this.synchronizer_) return false;
    if (!(await this.isAuthenticated())) return false;
    const sync = await this.synchronizer();
    return sync.state() !== "idle";
  }
}
