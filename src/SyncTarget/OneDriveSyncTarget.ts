import OneDriveApi from "../FileApi/OneDriveApi";
import { _ } from "@joplin/lib/locale";
import { BaseSyncTarget } from "./BaseSyncTarget";
import { parameters_ } from "../helpers/parameter";
import { FileApi } from "../FileApi/FileApi";
import { FileApiDriverOneDrive } from "../FileApi/Driver/FileApiOneDriveDriver";
import Synchronizer from "../Synchronizer/Synchronizer";

export default class SyncTargetOneDrive extends BaseSyncTarget {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
  private api_: any;
  private authToken_: string | null = null;
  private context_: any = null;

  public static id() {
    return 3;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
  public constructor(db: any, options: any = null) {
    super(db, options);
    this.api_ = null;
    // Options can include: authToken, context, clientId, clientSecret, isPublic
    if (options?.authToken) this.authToken_ = options.authToken;
    if (options?.context) this.context_ = options.context;
  }

  public static unsupportedPlatforms() {
    // Web: The login UI doesn't work.
    return ["web"];
  }

  public static targetName() {
    return "onedrive";
  }

  public static label() {
    return _("OneDrive");
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
    return !!this.option("oneDriveTest", false);
  }

  public oneDriveParameters() {
    // Use injected parameters from options, or fall back to defaults from parameters_
    if (this.option("clientId") && this.option("clientSecret")) {
      return {
        id: this.option("clientId"),
        secret: this.option("clientSecret"),
      };
    }

    const env = this.option("env", "dev");
    const params = parameters_[env] || parameters_.dev;
    return params.oneDrive;
  }

  public authRouteName() {
    return "OneDriveLogin";
  }

  public api() {
    if (this.isTesting()) {
      return this.fileApi_.driver().api();
    }

    if (this.api_) return this.api_;

    // Default to public client (mobile/desktop) unless specified otherwise
    const isPublic = this.option("isPublic", true);

    this.api_ = new OneDriveApi(
      this.oneDriveParameters().id,
      this.oneDriveParameters().secret,
      isPublic
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    this.api_.on("authRefreshed", (a: any) => {
      this.logger().info("OneDrive auth refreshed.");
      // Store auth token in instance for external handling
      this.authToken_ = a ? JSON.stringify(a) : null;
    });

    // Use injected auth token if available
    let auth = this.authToken_;
    if (auth) {
      try {
        const parsedAuth = typeof auth === "string" ? JSON.parse(auth) : auth;
        this.api_.setAuth(parsedAuth);
      } catch (error) {
        this.logger().warn("Could not parse OneDrive auth token");
        this.logger().warn(error);
      }
    }

    return this.api_;
  }

  public async initFileApi() {
    // Use injected context if available, otherwise query from API
    let context = this.context_;
    if (typeof context === "string") {
      context = context === "" ? null : JSON.parse(context);
    }
    let accountProperties = context ? context.accountProperties : null;
    const api = this.api();

    if (!accountProperties) {
      accountProperties = await api.execAccountPropertiesRequest();
      context = { accountProperties: accountProperties };
      // Store context in instance for external handling
      this.context_ = context;
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
    fileApi.setLogger(this.logger());
    return fileApi;
  }

  public async initSynchronizer() {
    try {
      if (!(await this.isAuthenticated()))
        throw new Error("User is not authenticated");

      // appType defaults to 'cli' if not specified
      const appType = this.option("appType", "cli");

      return new Synchronizer(this.db(), await this.fileApi(), appType);
    } catch (error) {
      BaseSyncTarget.dispatch({
        type: "SYNC_REPORT_UPDATE",
        report: { errors: [error] },
      });
      throw error;
    }
  }
}
