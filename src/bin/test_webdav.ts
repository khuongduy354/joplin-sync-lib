import { StorageAPI } from "../StorageAPI/StorageAPI";
import { createNote } from "../helpers";
async function toyWEBDAV() {
  const storage = new StorageAPI("WebDAV", {
    webDAVOptions: {
      username: "khuongduy354@gmail.com",
      password: "1234567891Duy*",
      path: "https://ivo.lv.tab.digital/remote.php/dav/files/khuongduy354%40gmail.com/JoplinSync",
      ignoreTlsErrors: true,
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
