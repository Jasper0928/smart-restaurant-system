import "dotenv/config";
import { getDb } from "./server/db";
getDb().then(db => {
  if (db) console.log("DB connection successful!");
  else console.log("DB connection failed.");
}).catch(console.error);
