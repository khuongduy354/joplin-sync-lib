import FsDriverNode from "./FsDriver/FsDriverNode";
import * as fs from "fs-extra";
import zlib from "zlib";
import timers from "timers";

abstract class AbstractSingleTon {
  protected fsDriver_: FsDriverNode = null;
  protected _db: any = null;

  abstract fetch(url: string, options: object): any;
  abstract fetchBlob(url: string, options: object): any;
  abstract uploadBlob(url: string, blob: Blob, options: object): any;
  abstract fsDriver(): FsDriverNode;
  abstract setupDb(_db: any): void;
  abstract db(): any;
}
export class SingleTon extends AbstractSingleTon {
  protected fsDriver_: FsDriverNode = null;
  protected _db: any = null;

  setupDb(_db: any) {
    this._db = _db;
  }
  db() {
    if (!this._db) throw new Error("Database not initialized");
    return this._db;
  }

  fileExists(filePath: string) {
    try {
      return fs.statSync(filePath).isFile();
    } catch (error) {
      return false;
    }
  }
  gunzipFile(source: string, destination: string) {
    if (!this.fileExists(source)) {
      throw new Error(`No such file: ${source}`);
    }

    return new Promise((resolve, reject) => {
      // prepare streams
      const src = fs.createReadStream(source);
      const dest = fs.createWriteStream(destination);

      // extract the archive
      src.pipe(zlib.createGunzip()).pipe(dest);

      // callback on extract completion
      dest.on("close", () => {
        resolve(null);
      });

      src.on("error", () => {
        reject();
      });

      dest.on("error", () => {
        reject();
      });
    });
  }
  fetchBlob(_url: string, options: Record<string, any>) {
    if (!options || !options.path)
      throw new Error("fetchBlob: target file path is missing");
    if (!options.method) options.method = "GET";
    // if (!('maxRetry' in options)) options.maxRetry = 5;

    // 21 maxRedirects is the default amount from follow-redirects library
    // 20 seems to be the max amount that most popular browsers will allow
    if (!options.maxRedirects) options.maxRedirects = 21;
    if (!options.timeout) options.timeout = undefined;

    const url = new URL(_url.trim());
    const method = options.method ? options.method : "GET";
    const http =
      url.protocol.toLowerCase() === "http:"
        ? require("follow-redirects").http
        : require("follow-redirects").https;
    const headers = options.headers ? options.headers : {};
    const filePath = options.path;

    function makeResponse(response: any) {
      return {
        ok: response.statusCode < 400,
        path: filePath,
        text: () => {
          return response.statusMessage;
        },
        json: () => {
          return {
            message: `${response.statusCode}: ${response.statusMessage}`,
          };
        },
        status: response.statusCode,
        headers: response.headers,
      };
    }

    const requestOptions: any = {
      protocol: url.protocol,
      host: url.hostname,
      port: url.port,
      method: method,
      path: url.pathname + (url.search ? `?${url.search}` : ""),
      headers: headers,
      timeout: options.timeout,
      maxRedirects: options.maxRedirects,
    };

    //TODO: proxy settings
    // const resolvedProxyUrl = resolveProxyUrl(proxySettings.proxyUrl);
    // requestOptions.agent = (resolvedProxyUrl && proxySettings.proxyEnabled) ? shim.proxyAgent(url.href, resolvedProxyUrl) : null;

    const doFetchOperation = async () => {
      return new Promise((resolve, reject) => {
        let file: any = null;

        const cleanUpOnError = (error: any) => {
          // We ignore any unlink error as we only want to report on the main error
          void fs
            .unlink(filePath)
            // eslint-disable-next-line promise/prefer-await-to-then -- Old code before rule was applied
            .catch(() => {})
            // eslint-disable-next-line promise/prefer-await-to-then -- Old code before rule was applied
            .then(() => {
              if (file) {
                file.close(() => {
                  file = null;
                  reject(error);
                });
              } else {
                reject(error);
              }
            });
        };

        try {
          // Note: relative paths aren't supported
          file = fs.createWriteStream(filePath);

          file.on("error", (error: any) => {
            cleanUpOnError(error);
          });

          const request = http.request(requestOptions, (response: any) => {
            response.pipe(file);

            const isGzipped = response.headers["content-encoding"] === "gzip";

            file.on("finish", () => {
              file.close(async () => {
                if (isGzipped) {
                  const gzipFilePath = `${filePath}.gzip`;
                  await this.fsDriver().move(filePath, gzipFilePath);

                  try {
                    await this.gunzipFile(gzipFilePath, filePath);
                    resolve(makeResponse(response));
                  } catch (error) {
                    cleanUpOnError(error);
                  }

                  await this.fsDriver().remove(gzipFilePath);
                } else {
                  resolve(makeResponse(response));
                }
              });
            });
          });

          request.on("timeout", () => {
            request.destroy(
              new Error(
                `Request timed out. Timeout value: ${requestOptions.timeout}ms.`,
              ),
            );
          });

          request.on("error", (error: any) => {
            cleanUpOnError(error);
          });

          request.end();
        } catch (error) {
          cleanUpOnError(error);
        }
      });
    };

    return this.fetchWithRetry(doFetchOperation, options);
  }

  async fetchWithRetry(fetchFn: Function, options: any = null) {
    try {
      // if (!options) options = {};
      // if (!options.timeout) options.timeout = 1000 * 120; // ms
      // if (!('maxRetry' in options)) options.maxRetry = shim.fetchMaxRetry_;
      const response = await fetchFn();
      return response;
    } catch (error) {
      throw error;
    }
    // let retryCount = 0;
    // while (true) {
    // 	try {
    // 		const response = await fetchFn();
    // 		return response;
    // 	} catch (error) {
    // 		throw error;
    // 		//TODO: retry here
    // 		// if (shim.fetchRequestCanBeRetried(error)) {
    // 		// 	retryCount++;
    // 		// 	if (retryCount > options.maxRetry) throw error;
    // 		// 	await shim.msleep_(retryCount * 3000);
    // 		// } else {
    // 		// 	throw error;
    // 		// }
    // 	}
    // }
  }

  uploadBlob(url: string, options: object) {}

  fetch(url: string, options = {}) {
    // Check if the url is valid
    try {
      new URL(url);
    } catch (error) {
      throw new Error(`Not a valid URL: ${url}`);
    }
    // const resolvedProxyUrl = resolveProxyUrl(proxySettings.proxyUrl);
    // options.agent = (resolvedProxyUrl && proxySettings.proxyEnabled) ? shim.proxyAgent(url, resolvedProxyUrl) : null;
    // return shim.fetchWithRetry(() => {
    // 	return nodeFetch(url, options);
    // }, options);
    return fetch(url, options);
  }

  fsDriver() {
    if (!this.fsDriver_) this.fsDriver_ = new FsDriverNode();
    return this.fsDriver_;
  }
  setTimeout(fn: Function, interval: number) {
    return timers.setTimeout(fn, interval);
  }

  setInterval(fn: Function, interval: number) {
    return timers.setInterval(fn, interval);
  }

  clearTimeout(id: number) {
    return timers.clearTimeout(id);
  }

  clearInterval(id: number) {
    return timers.clearInterval(id);
  }
}

export const singleton = new SingleTon();
