import zlib from "zlib";
import fs from "fs-extra";
import { singleton } from "../singleton";
export type FetchBlobOptions = {
  path?: string;
  method?: string;
  maxRedirects?: number;
  timeout?: number;
  headers?: Record<string, string>;
};

function fileExists(filePath: string) {
  try {
    return fs.statSync(filePath).isFile();
  } catch (error) {
    return false;
  }
}
function gunzipFile(source: string, destination: string) {
  if (!fileExists(source)) {
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

export const fetchBlob = async function (
  urlString: string,
  options: FetchBlobOptions
) {
  if (!options || !options.path)
    throw new Error("fetchBlob: target file path is missing");
  if (!options.method) options.method = "GET";
  // if (!('maxRetry' in options)) options.maxRetry = 5;

  // 21 maxRedirects is the default amount from follow-redirects library
  // 20 seems to be the max amount that most popular browsers will allow
  if (!options.maxRedirects) options.maxRedirects = 21;
  if (!options.timeout) options.timeout = undefined;

  const url = new URL(urlString.trim());
  const method = options.method ? options.method : "GET";
  const http =
    url.protocol.toLowerCase() === "http:"
      ? require("follow-redirects").http
      : require("follow-redirects").https;
  const headers = options.headers ? options.headers : {};
  const filePath = options.path;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
  function makeResponse(response: any) {
    return {
      ok: response.statusCode < 400,
      path: filePath,
      text: () => {
        return response.statusMessage;
      },
      json: () => {
        return { message: `${response.statusCode}: ${response.statusMessage}` };
      },
      status: response.statusCode,
      headers: response.headers,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
  const requestOptions: any = {
    protocol: url.protocol,
    host: url.hostname,
    port: url.port,
    method: method,
    path: url.pathname + (url.search ? url.search : ""),
    headers: headers,
    timeout: options.timeout,
    maxRedirects: options.maxRedirects,
  };

  const doFetchOperation = async () => {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
      let file: any = null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        file.on("error", (error: any) => {
          cleanUpOnError(error);
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const request = http.request(requestOptions, (response: any) => {
          response.pipe(file);

          const isGzipped = response.headers["content-encoding"] === "gzip";

          file.on("finish", () => {
            file.close(async () => {
              if (isGzipped) {
                const gzipFilePath = `${filePath}.gzip`;
                await singleton.fsDriver().move(filePath, gzipFilePath);

                try {
                  await gunzipFile(gzipFilePath, filePath);
                  // Calling request.destroy() within the downloadController can cause problems.
                  // The response.pipe(file) will continue even after request.destroy() is called,
                  // potentially causing the same promise to resolve while the cleanUpOnError
                  // is removing the file that have been downloaded by this function.
                  if (request.destroyed) return;
                  resolve(makeResponse(response));
                } catch (error) {
                  cleanUpOnError(error);
                }

                await singleton.fsDriver().remove(gzipFilePath);
              } else {
                if (request.destroyed) return;
                resolve(makeResponse(response));
              }
            });
          });
        });

        request.on("timeout", () => {
          request.destroy(
            new Error(
              `Request timed out. Timeout value: ${requestOptions.timeout}ms.`
            )
          );
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        request.on("error", (error: any) => {
          cleanUpOnError(error);
        });

        request.end();
      } catch (error) {
        cleanUpOnError(error);
      }
    });
  };

  return doFetchOperation();
};
