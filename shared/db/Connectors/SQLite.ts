import { type BunSQLiteDatabase, drizzle } from "drizzle-orm/bun-sqlite";
import Logger from "../../logger/Logger";
import { Configuration } from "../../utils/cache/Configuration";

export default class SQLiteConnector {
    private static db: BunSQLiteDatabase<Record<string, never>> & { $client: object };
    public getDB(): BunSQLiteDatabase<Record<string, never>> & { $client: object } {
        const config = Configuration.getConfig();
        if (!config.database.database_file_location) {
            throw new Error(
                "To use SQLite as the DB backend, provide the DB_FILE_NAME environment Variable",
            );
        }

        if (!SQLiteConnector.db) {
            Logger.debug(`Using ${config.database.database_file_location} as sqlite db.`);
            SQLiteConnector.db = drizzle(config.database.database_file_location);
        }

        return SQLiteConnector.db;
    }

    public static setDb(db: BunSQLiteDatabase<Record<string, never>> & { $client: object }) {
        SQLiteConnector.db = db;
    }
}
