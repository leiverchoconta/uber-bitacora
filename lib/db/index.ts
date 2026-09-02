import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set — copy .env.example to .env.local");
}

export const db = drizzle(process.env.DATABASE_URL, { schema });
export { schema };
