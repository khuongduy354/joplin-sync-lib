import { StorageAPI } from "../StorageAPI/StorageAPI";
import { createNote } from "../helpers";
import "dotenv/config";
async function toyWEBDAV() {
  const storage = new StorageAPI("WebDAV", {
    webDAVOptions: {
      username: process.env.WEBDAV_USERNAME,
      password: process.env.WEBDAV_PASSWORD,
      path: process.env.WEBDAV_PATH,
      ignoreTlsErrors: process.env.WEBDAV_IGNORE_TLS_ERRORS === "true",
    },
  });

  await storage.init();

  const note = createNote({
    title: "My First Note",
    body: "Hello from Joplin Sync Lib!",
    parent_id: "078a2b9bac664b99adc0ed82a8ef14c4",
  });

  const res = await storage.createItem(note);
  console.info("created note:", res);
  const res2 = await storage.getItems();
  console.info("Retrieved items:", res2[0].path);
}

toyWEBDAV();
