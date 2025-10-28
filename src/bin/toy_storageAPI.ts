import { createNote } from "../helpers/item";
import itemCreationExamples from "../sample_app/itemCreationExamples";
import { StorageAPI } from "../StorageAPI/StorageAPI";

async function toyWEBDAV() {
  const storage = new StorageAPI("OneDrive", {
    webDAVOptions: {
      username: "khuongduy354@gmail.com",
      password: "141592654Duy",
      path: "https://tio.lv.tab.digital/remote.php/dav/files/khuongduy354%40gmail.com",
      ignoreTlsErrors: true,
    },
  });

  const note = createNote({
    title: "My First Note",
    body: "Hello from Joplin Sync Lib!",
    parent_id: "", // Root folder
  });

  const res = await storage.createItem(note);
  console.info("Created note:", res);
  const res2 = await storage.getItems();
  console.info("Retrieved items:", res2[0].path);
}

async function bettermain() {
  const storage = new StorageAPI("JoplinServer", {
    joplinServerOptions: {
      username: "admin@localhost",
      password: "admin",
      path: "http://localhost:22300",
      userContentPath: "http://localhost:22300",
    },
  });

  const note = createNote({
    title: "My First Note",
    body: "Hello from Joplin Sync Lib!",
    parent_id: "", // Root folder
  });

  const res = await storage.createItem(note);
  console.info("Created note:", res);
  const res2 = await storage.getItems();
  console.info("Retrieved items:", res2[0].path);
}

try {
  // bettermain();
  // const res = itemCreationExamples.exampleUsingFactory();
  // console.info("Example using factory:", res);
  toyWEBDAV();
} catch (e) {
  // console.error("Error in main:", e);
}
