import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import SQLiteConnector from "../../../shared/db/Connectors/SQLite";
import type { SupportedDatabasesString } from "../../../shared/db/DAO/DAO";

/**
 * @description This is a helper function to setup a database (defined by the type string) to the defined state in migrations
 * @param {SupportedDatabasesString} type The type of database to setup
 * @returns {Promise<void>}
 * */
export async function setupDatabase(type: SupportedDatabasesString): Promise<void> {
    if (type === "SQLite") {
        process.env.DB_TYPE = "sqlite";
        process.env.DB_FILE_NAME = ":memory:";

        const sqlite = new Database(":memory:");

        sqlite.run("PRAGMA foreign_keys = ON;");

        const db = drizzle(sqlite);

        migrate(db, {
            migrationsFolder: "./cache/cache-drizzle-conf",
        });
        SQLiteConnector.setDb(db);
    }
}
