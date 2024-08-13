import { fetchBlob } from "../../helpers/fetchBlob";
import fs from "fs-extra";

describe("helpers.fetch.test", () => {
  it("Should download blob to temp folder", async () => {
    // this sometimes throw error as a long running test
    const url = "https://joplinapp.org/images/logo-text.svg";
    const localPath = "./temp/joplin-logo.svg";

    expect(fs.existsSync(localPath)).toBe(false);

    fs.ensureDirSync("./temp");
    await fetchBlob(url, { path: localPath });

    expect(fs.statSync(localPath).isFile()).toBe(true);

    fs.unlinkSync(localPath);
    expect(fs.existsSync(localPath)).toBe(false);
  });
});
