import GoogleDriveApi from "../FileApi/GoogleDriveApi";
import { _ } from "@joplin/lib/locale";
import { BaseSyncTarget } from "./BaseSyncTarget";
import { parameters_ } from "../helpers/parameter";
import { FileApi } from "../FileApi/FileApi";
import { FileApiDriverGoogleDrive } from "../FileApi/Driver/FileApiGoogleDriveDriver";
import Synchronizer from "../Synchronizer/Synchronizer";

export default class GoogleDriveSyncTarget extends BaseSyncTarget {
  private api_: any;
  private authToken_: string | null = null;

  public static id() {
    return 10; // New ID for GoogleDrive
  }

  public constructor(db: any, options: any = null) {
    super(db, options);
    this.api_ = null;
    // Options can include: authToken, clientId, clientSecret, isPublic
    if (options?.authToken) this.authToken_ = options.authToken;
  }

  public static unsupportedPlatforms() {
    return [];
  }

  public static targetName() {
    return "googledrive";
  }

  public static label() {
    return _("Google Drive");
  }

  public static description() {
    return "A file storage and synchronization service developed by Google.";
  }

  public static supportsSelfHosted(): boolean {
    return false;
  }

  public async isAuthenticated() {
    return !!this.api().auth();
  }

  public syncTargetId() {
    return GoogleDriveSyncTarget.id();
  }

  public isTesting() {
    return !!this.option("googleDriveTest", false);
  }

  public googleDriveParameters() {
    // Use injected parameters from options, or fall back to defaults from parameters_
    if (this.option("clientId") && this.option("clientSecret")) {
      return {
        id: this.option("clientId"),
        secret: this.option("clientSecret"),
      };
    }

    const env = this.option("env", "dev");
    const params = parameters_[env] || parameters_.dev;

    // Add googleDrive to parameters_ if not exists
    if (!params.googleDrive) {
      params.googleDrive = {
        id: "",
        secret: "",
      };
    }

    return params.googleDrive;
  }

  public authRouteName() {
    return "GoogleDriveLogin";
  }

  public api() {
    if (this.isTesting()) {
      return this.fileApi_.driver().api();
    }

    if (this.api_) return this.api_;

    // Default to public client (mobile/desktop) unless specified otherwise
    const isPublic = this.option("isPublic", true);

    this.api_ = new GoogleDriveApi(
      this.googleDriveParameters().id,
      this.googleDriveParameters().secret,
      isPublic
    );

    this.api_.on("authRefreshed", (a: any) => {
      this.logger().info("Google Drive auth refreshed.");
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
        this.logger().warn("Could not parse Google Drive auth token");
        this.logger().warn(error);
      }
    }

    return this.api_;
  }

  public async initFileApi() {
    const api = this.api();
    const appDir = await api.appDirectory();

    // Google Drive uses 'appDataFolder' as the base directory
    const fileApi = new FileApi(appDir, new FileApiDriverGoogleDrive(api));
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
