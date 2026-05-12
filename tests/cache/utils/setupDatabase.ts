import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import SQLiteConnector from "../../../shared/db/Connectors/SQLite";

/**
 * @description This is a helper function to setup sqlite in memory for mock testing the cache api routes
 * @returns {Promise<void>}
 * */
export async function setupDatabaseForCacheMockTesting(): Promise<void> {
    process.env.DB_TYPE = "sqlite";
    process.env.DB_FILE_NAME = ":memory:";

    const sqlite = new Database(":memory:");

    sqlite.run("PRAGMA foreign_keys = ON;");

    const db = drizzle(sqlite);

    migrate(db, {
        migrationsFolder: "./cache/drizzle/sqlite_drizzle",
    });
    SQLiteConnector.setDb(db);
}
