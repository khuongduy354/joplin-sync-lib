// import { FileApi } from "../FileApi/FileApi";
import { OneDriveApi } from "../FileApi/ProviderAPI/OneDriveApi";
import Synchronizer from "../Synchronizer/Synchronizer";
import { BaseSyncTarget } from "./BaseSyncTarget";
import Setting from "@joplin/lib/models/Setting";
// const {
//   FileApiDriverOneDrive,
// } = require("../FileApi/FileApiProviderAdapter/FileApiOneDriveAdapter.js");

// const Setting: any = {};
export type authInfo = {
  id: string;
  secret: string;
};

export default class SyncTargetOneDrive extends BaseSyncTarget {
  private api_: OneDriveApi;

  public static id() {
    return 3;
  }

  public constructor(db: any, authInfo: authInfo, options: any = null) {
    super(db, options);
    this.api_ = null;
    this.initApi(authInfo);
  }
  public authenticate(clientId: string, clientSecret: string) {}
  public static targetName() {
    return "onedrive";
  }

  public static label() {
    return "OneDrive";
  }

  public static description() {
    return "A file hosting service operated by Microsoft as part of its web version of Office.";
  }

  public static supportsSelfHosted(): boolean {
    return false;
  }

  public async isAuthenticated() {
    return !!this.api().auth();
  }

  public syncTargetId() {
    return SyncTargetOneDrive.id();
  }

  public isTesting() {
    return false;
  }

  public authRouteName() {
    return "OneDriveLogin";
  }
  private initApi(authInfo: authInfo) {
    // TODO: public
    const isPublic = false;

    this.api_ = new OneDriveApi(authInfo.id, authInfo.secret, isPublic);

    this.api_.on("authRefreshed", (a: any) => {
      this.logger().info("Saving updated OneDrive auth.");
      Setting.setValue(
        `sync.${this.syncTargetId()}.auth`,
        a ? JSON.stringify(a) : null
      );
    });

    // let auth = Setting.value(`sync.${this.syncTargetId()}.auth`);
    let auth = "";
    console.log("Setting auth: ", auth);
    if (auth) {
      try {
        auth = JSON.parse(auth);
      } catch (error) {
        this.logger().warn("Could not parse OneDrive auth token");
        this.logger().warn(error);
        auth = null;
      }

      this.api_.setAuth(auth);
    }
  }

  public api() {
    if (this.isTesting()) {
      return this.fileApi_.driver().api() as OneDriveApi;
    }

    if (this.api_) {
      return this.api_;
    } else {
      throw new Error("OneDrive API not initialized");
    }
  }

  public async initFileApi() {
    let context = Setting.value(`sync.${this.syncTargetId()}.context`);
    context = context === "" ? null : JSON.parse(context);
    let accountProperties = context ? context.accountProperties : null;
    const api = this.api();

    if (!accountProperties) {
      accountProperties = await api.execAccountPropertiesRequest();
      context
        ? (context.accountProperties = accountProperties)
        : (context = { accountProperties: accountProperties });
      Setting.setValue(
        `sync.${this.syncTargetId()}.context`,
        JSON.stringify(context)
      );
    }
    api.setAccountProperties(accountProperties);
    const appDir = await this.api().appDirectory();
    // the appDir might contain non-ASCII characters
    // /[^\u0021-\u00ff]/ is used in Node.js to detect the unescaped characters.
    // See https://github.com/nodejs/node/blob/bbbf97b6dae63697371082475dc8651a6a220336/lib/_http_client.js#L176
    // eslint-disable-next-line prefer-regex-literals -- Old code before rule was applied
    const baseDir =
      RegExp(/[^\u0021-\u00ff]/).exec(appDir) !== null
        ? encodeURI(appDir)
        : appDir;
    const fileApi = new FileApi(baseDir, new FileApiDriverOneDrive(this.api()));
    fileApi.setSyncTargetId(this.syncTargetId());
    // fileApi.setLogger(this.logger());
    return fileApi;
  }

  public async initSynchronizer() {
    try {
      if (!(await this.isAuthenticated()))
        throw new Error("User is not authenticated");
      return new Synchronizer(
        this.db(),
        await this.fileApi(),
        Setting.value("appType")
      );
    } catch (error) {
      BaseSyncTarget.dispatch({
        type: "SYNC_REPORT_UPDATE",
        report: { errors: [error] },
      });
      throw error;
    }
  }
}
