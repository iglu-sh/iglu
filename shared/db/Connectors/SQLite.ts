import type Database from "bun:sqlite";
import { type BunSQLiteDatabase, drizzle } from "drizzle-orm/bun-sqlite";

export default class SQLiteConnector {
    private static db: BunSQLiteDatabase<Record<string, never>> & { $client: object } = drizzle(
        process.env.DB_FILE_NAME ? process.env.DB_FILE_NAME : "",
    );
    public getDB(): BunSQLiteDatabase<Record<string, never>> & { $client: object } {
        if (!process.env.DB_FILE_NAME) {
            throw new Error(
                "To use SQLite as the DB backend, provide the DB_FILE_NAME environment Variable",
            );
        }

        return SQLiteConnector.db;
    }

    public static setDb(db: BunSQLiteDatabase<Record<string, never>> & { $client: object }) {
        SQLiteConnector.db = db;
    }
}
