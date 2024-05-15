import JoplinDatabase from "@joplin/lib/JoplinDatabase";
const DatabaseDriverNode = require("./database-driver-node.js");

export const initDb = async (path: string) => {
  const db = new JoplinDatabase(new DatabaseDriverNode());
  //@ts-ignore
  db.setLogger(console);
  await db.open({ name: path });
  return db;
};
