import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type Database = ReturnType<typeof drizzle<typeof schema>>;

let instance: Database | undefined;

/**
 * The client is built on first query, never at import time: a page that does
 * not read the database must not fail to build because a runtime secret is
 * absent. Missing configuration still fails loudly — just at the query.
 */
export function getDb(): Database {
  if (!instance) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL is not set — copy .env.example to .env.local",
      );
    }
    instance = drizzle(url, { schema });
  }
  return instance;
}

export { schema };
