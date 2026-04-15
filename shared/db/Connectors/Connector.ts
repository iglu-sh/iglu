import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

export interface Connector {
    getDB(): BunSQLiteDatabase<Record<string, never>> & { $client: object };
}
