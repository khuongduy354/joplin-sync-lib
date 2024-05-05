import _sqlite3 from "sqlite3";

export const initDb = (path: string) => {
  const sqlite3 = _sqlite3.verbose();
  const db = new sqlite3.Database(path);
  return db;
};
