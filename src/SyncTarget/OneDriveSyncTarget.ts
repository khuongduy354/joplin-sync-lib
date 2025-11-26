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
  private oauthFlowHandler_: ((url: string) => Promise<string>) | null = null;

  public static id() {
    return 3;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
  public constructor(db: any, options: any = null) {
    super(db, options);
    this.api_ = null;
    // Options can include: authToken, context, clientId, clientSecret, isPublic, oauthFlowHandler
    if (options?.authToken) this.authToken_ = options.authToken;
    if (options?.context) this.context_ = options.context;
    if (options?.oauthFlowHandler)
      this.oauthFlowHandler_ = options.oauthFlowHandler;

    // Validate authentication options
    this.validateAuthOptions(options);
  }

  /**
   * Validates that either authToken or (clientId + clientSecret) is provided
   */
  private validateAuthOptions(options: any) {
    const hasAuthToken = options?.authToken;
    const hasClientCredentials = options?.clientId && options?.clientSecret;

    // If no auth token, client credentials are required
    if (!hasAuthToken && !hasClientCredentials) {
      // Check if using default parameters
      const env = options?.env || "dev";
      const params = parameters_[env] || parameters_.dev;
      const hasDefaultCredentials =
        params.oneDrive?.id && params.oneDrive?.secret;

      if (!hasDefaultCredentials) {
        throw new Error(
          "OneDrive authentication requires either: " +
            "1) An authToken (pre-authenticated), or " +
            "2) Both clientId and clientSecret to initiate OAuth flow. " +
            "Please provide valid authentication credentials."
        );
      }
    }
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

  /**
   * Initiates OAuth flow if no auth token is available
   * @param redirectUri - The redirect URI for OAuth callback (defaults to Azure native client URL)
   * @returns The authorization code from OAuth flow
   */
  public async initiateOAuthFlow(redirectUri?: string): Promise<void> {
    const api = this.api();
    // Use Azure's native client redirect URL by default
    const uri = redirectUri || api.nativeClientRedirectUrl();
    const authUrl = api.authCodeUrl(uri);

    this.logger().info("Initiating OneDrive OAuth flow...");
    this.logger().info(`Authorization URL: ${authUrl}`);

    if (this.oauthFlowHandler_) {
      // Use custom OAuth flow handler provided by the application
      try {
        const authCode = await this.oauthFlowHandler_(authUrl);
        await api.execTokenRequest(authCode, uri);
        this.authToken_ = JSON.stringify(api.auth());
        this.logger().info("OAuth flow completed successfully");
      } catch (error) {
        this.logger().error("OAuth flow failed:", error);
        throw new Error(`OneDrive OAuth flow failed: ${error.message}`);
      }
    } else {
      // No handler provided - instruct user to complete flow manually
      throw new Error(
        `OneDrive authentication required. Please visit the following URL to authorize:\n\n${authUrl}\n\n` +
          "After authorization, provide the auth token via 'authToken' option, or " +
          "implement an 'oauthFlowHandler' to automate the OAuth flow."
      );
    }
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
      // Check if authenticated, if not, attempt OAuth flow
      if (!(await this.isAuthenticated())) {
        // If we have client credentials but no auth token, try to initiate OAuth
        const hasClientCredentials =
          this.option("clientId") && this.option("clientSecret");
        const params = this.oneDriveParameters();
        const hasDefaultCredentials = params.id && params.secret;

        if (hasClientCredentials || hasDefaultCredentials) {
          this.logger().warn("No auth token found. OAuth flow required.");
          await this.initiateOAuthFlow();

          // Verify authentication succeeded
          if (!(await this.isAuthenticated())) {
            throw new Error(
              "OAuth flow completed but user is still not authenticated"
            );
          }
        } else {
          throw new Error("User is not authenticated");
        }
      }

      // Initialize file API after successful authentication
      if (!this.fileApi_) {
        this.fileApi_ = await this.initFileApi();
      }

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
