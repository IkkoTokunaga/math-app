import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = PostgresJsDatabase<typeof schema>;

let client: ReturnType<typeof postgres> | null = null;
let dbInstance: Db | null = null;

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function isLocalDatabase(url: string): boolean {
  return url.includes("localhost") || url.includes("@db:") || url.includes("127.0.0.1");
}

function createDb(): Db {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  client = postgres(connectionString, {
    max: 1,
    ssl: isLocalDatabase(connectionString) ? false : "require",
    prepare: connectionString.includes("-pooler") ? false : undefined,
  });

  dbInstance = drizzle(client, { schema });
  return dbInstance;
}

export function getDb(): Db {
  if (!dbInstance) {
    return createDb();
  }
  return dbInstance;
}
