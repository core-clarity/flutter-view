import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";

import * as schema from "./schema";

export type Database = NeonHttpDatabase<typeof schema>;

let instance: Database | null = null;

export function getDb(): Database {
  if (!instance) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL が設定されていません。.env.local に Neon の接続文字列を設定してください。",
      );
    }
    instance = drizzle(neon(url), { schema });
  }
  return instance;
}
