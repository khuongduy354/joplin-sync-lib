import { singleton } from "../singleton";
import time from "../helpers/time";
import Logger from "../joplin-lib-mock/Logger";
import { _ } from "../joplin-lib-mock/locale";
import { helperMisc } from "../helpers/misc";
import { fetchBlob, uploadBlob } from "../helpers/fetchBlob";
import { Buffer } from "buffer";

const logger = Logger.create("GoogleDriveApi");

export default class GoogleDriveApi {
  private clientId_: string;
  private clientSecret_: string;
  private auth_: any = null;
  private appDataFolderId_: string | null = null;
  private isPublic_: boolean;
  private listeners_: Record<string, any>;

  // Google Drive API endpoints
  private readonly API_BASE = "https://www.googleapis.com/drive/v3";
  private readonly UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";
  private readonly TOKEN_URL = "https://oauth2.googleapis.com/token";
  private readonly AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

  public constructor(
    clientId: string,
    clientSecret: string,
    isPublic: boolean,
  ) {
    this.clientId_ = clientId;
    this.clientSecret_ = clientSecret;
    this.auth_ = null;
    this.isPublic_ = isPublic;
    this.listeners_ = {
      authRefreshed: [],
    };
  }

  public isPublic() {
    return this.isPublic_;
  }

  public dispatch(eventName: string, param: any) {
    const ls = this.listeners_[eventName];
    for (let i = 0; i < ls.length; i++) {
      ls[i](param);
    }
  }

  public on(eventName: string, callback: Function) {
    this.listeners_[eventName].push(callback);
  }

  public auth(): any {
    return this.auth_;
  }

  public setAuth(auth: any) {
    this.auth_ = auth;
    this.dispatch("authRefreshed", this.auth());
  }

  public token() {
    return this.auth_ ? this.auth_.access_token : null;
  }

  public clientId() {
    return this.clientId_;
  }

  public clientSecret() {
    return this.clientSecret_;
  }

  /**
   * Get the appDataFolder special folder ID
   * Google Drive uses 'appDataFolder' as a special space for app data
   */
  public async appDirectory() {
    if (this.appDataFolderId_) return this.appDataFolderId_;

    // For Google Drive, we use the special 'appDataFolder' space
    // This is a hidden folder only accessible by the app
    this.appDataFolderId_ = "appDataFolder";
    return this.appDataFolderId_;
  }

  /**
   * Generate OAuth authorization URL
   */
  public authCodeUrl(redirectUri: string) {
    const params = {
      client_id: this.clientId_,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/drive.appdata",
      access_type: "offline",
      prompt: "consent",
    };

    return `${this.AUTH_URL}?${helperMisc.objectToQueryString(params)}`;
  }

  /**
   * Exchange authorization code for access token
   */
  public async execTokenRequest(code: string, redirectUri: string) {
    const body: any = {
      client_id: this.clientId(),
      code: code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    };

    if (!this.isPublic()) {
      body.client_secret = this.clientSecret();
    }

    const r = await fetch(this.TOKEN_URL, {
      method: "POST",
      body: helperMisc.objectToQueryString(body),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (!r.ok) {
      const text = await r.text();
      throw new Error(
        `Could not retrieve auth token: ${r.status}: ${r.statusText}: ${text}`,
      );
    }

    const json = await r.json();
    this.setAuth(json);
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken() {
    if (!this.auth_ || !this.auth_.refresh_token) {
      throw new Error("No refresh token available");
    }

    const body: any = {
      client_id: this.clientId(),
      refresh_token: this.auth_.refresh_token,
      grant_type: "refresh_token",
    };

    if (!this.isPublic()) {
      body.client_secret = this.clientSecret();
    }

    const r = await fetch(this.TOKEN_URL, {
      method: "POST",
      body: helperMisc.objectToQueryString(body),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (!r.ok) {
      const text = await r.text();
      throw new Error(`Token refresh failed: ${r.status}: ${text}`);
    }

    const json = await r.json();
    // Preserve refresh_token if not returned
    if (!json.refresh_token && this.auth_.refresh_token) {
      json.refresh_token = this.auth_.refresh_token;
    }

    this.setAuth(json);
  }

  /**
   * Convert Google Drive API error to Error object
   */
  private googleDriveErrorToError(errorResponse: any) {
    if (!errorResponse) return new Error("Undefined error");

    if (errorResponse.error) {
      const error = errorResponse.error;
      const message = error.message || JSON.stringify(error);
      const code = error.code || error.status;

      const e: any = new Error(message);
      if (code) e.code = code;
      if (error.errors && error.errors.length > 0) {
        e.reason = error.errors[0].reason;
      }
      return e;
    }

    return new Error(JSON.stringify(errorResponse));
  }

  /**
   * Make HTTP request to Google Drive API with automatic retry and token refresh
   */
  private async makeRequest(
    method: string,
    url: string,
    query: any = null,
    body: any = null,
    options: any = null,
  ) {
    options = options || {};

    if (!url.startsWith("http")) {
      url = `${this.API_BASE}${url}`;
    }

    if (query) {
      url += `?${helperMisc.objectToQueryString(query)}`;
    }

    const headers: any = {
      Authorization: `Bearer ${this.token()}`,
    };

    if (body && typeof body === "object" && !(body instanceof Buffer)) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(body);
    }

    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        const response = await fetch(url, {
          method,
          headers,
          body: method !== "GET" ? body : undefined,
        });

        // Handle token expiration
        if (response.status === 401) {
          await this.refreshAccessToken();
          headers.Authorization = `Bearer ${this.token()}`;
          retryCount++;
          continue;
        }

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get("Retry-After");
          const waitTime = retryAfter
            ? parseInt(retryAfter) * 1000
            : Math.pow(2, retryCount) * 1000;
          logger.info(`Rate limited, waiting ${waitTime}ms before retry`);
          await time.sleep(waitTime);
          retryCount++;
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text();
          let errorObj;
          try {
            errorObj = JSON.parse(errorText);
          } catch {
            errorObj = { error: { message: errorText } };
          }
          throw this.googleDriveErrorToError(errorObj);
        }

        return response;
      } catch (error) {
        if (retryCount >= maxRetries - 1) throw error;
        retryCount++;
        await time.sleep(1000 * retryCount);
      }
    }

    throw new Error("Max retries exceeded");
  }

  /**
   * Execute API call and return JSON response
   */
  public async execJson(
    method: string,
    url: string,
    query: any = null,
    body: any = null,
  ): Promise<any> {
    const response = await this.makeRequest(method, url, query, body);
    return await response.json();
  }

  /**
   * Execute API call and return text response
   */
  public async execText(
    method: string,
    url: string,
    query: any = null,
    body: any = null,
  ): Promise<string> {
    const response = await this.makeRequest(method, url, query, body);
    return await response.text();
  }

  /**
   * Execute API call and return Response object
   */
  public async exec(
    method: string,
    url: string,
    query: any = null,
    body: any = null,
    options: any = null,
  ): Promise<Response> {
    return await this.makeRequest(method, url, query, body, options);
  }

  /**
   * List files in a folder (or appDataFolder)
   */
  public async listFiles(
    folderId: string = "appDataFolder",
    pageToken: string | null = null,
    pageSize: number = 1000,
  ) {
    const query: any = {
      spaces: folderId === "appDataFolder" ? "appDataFolder" : "drive",
      pageSize: pageSize,
      fields:
        "nextPageToken, files(id, name, mimeType, modifiedTime, size, trashed)",
    };

    if (folderId !== "appDataFolder") {
      query.q = `'${folderId}' in parents and trashed = false`;
    }

    if (pageToken) {
      query.pageToken = pageToken;
    }

    return await this.execJson("GET", "/files", query);
  }

  /**
   * Get file metadata
   */
  public async getFileMetadata(fileId: string) {
    return await this.execJson("GET", `/files/${fileId}`, {
      fields: "id, name, mimeType, modifiedTime, size, trashed",
    });
  }

  /**
   * Download file content
   */
  public async downloadFile(fileId: string, options: any = null) {
    return await this.exec(
      "GET",
      `/files/${fileId}`,
      { alt: "media" },
      null,
      options,
    );
  }

  /**
   * Upload file (simple upload for files < 5MB)
   */
  public async uploadFile(
    name: string,
    content: any,
    mimeType: string = "text/plain",
    folderId: string = "appDataFolder",
    options: any = null,
  ) {
    const metadata = {
      name: name,
      parents: [folderId],
    };

    const boundary = "-------314159265358979323846";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelim = `\r\n--${boundary}--`;

    let body = delimiter;
    body += "Content-Type: application/json\r\n\r\n";
    body += JSON.stringify(metadata);
    body += delimiter;
    body += `Content-Type: ${mimeType}\r\n\r\n`;

    if (typeof content === "string") {
      body += content;
    } else if (content instanceof Buffer) {
      // For binary content, we need multipart upload
      // This is a simplified version; production should use resumable upload
      throw new Error("Binary upload not yet implemented");
    }

    body += closeDelim;

    const url = `${this.UPLOAD_BASE}/files?uploadType=multipart`;

    return await this.makeRequest("POST", url, null, body, {
      headers: {
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
    }).then((r) => r.json());
  }

  /**
   * Update file content
   */
  public async updateFile(
    fileId: string,
    content: any,
    mimeType: string = "text/plain",
    options: any = null,
  ) {
    const url = `${this.UPLOAD_BASE}/files/${fileId}?uploadType=media`;

    return await this.makeRequest("PATCH", url, null, content, {
      headers: {
        "Content-Type": mimeType,
      },
    }).then((r) => r.json());
  }

  /**
   * Delete file
   */
  public async deleteFile(fileId: string) {
    return await this.exec("DELETE", `/files/${fileId}`);
  }

  /**
   * Create folder
   */
  public async createFolder(name: string, parentId: string = "appDataFolder") {
    const metadata = {
      name: name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    };

    return await this.execJson("POST", "/files", null, metadata);
  }
}
