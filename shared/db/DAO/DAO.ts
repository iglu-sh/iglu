import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import type {NodePgDatabase} from "drizzle-orm/node-postgres"
import type { Pool } from "pg";
import Logger from "../../logger/Logger";
import { Configuration } from "../../utils/cache/Configuration";
import SQLiteConnector from "../Connectors/SQLite";
import PostgresConnector from "../Connectors/Postgres";

export type SupportedDatabasesString = "SQLite" | "Postgres";
export type SQLiteExecutor = BunSQLiteDatabase<Record<string, never>> & { $client: object };
export type PgExecutor = NodePgDatabase<Record<string, never>> & { $client: Pool };

export abstract class DAO<T> {
    private static type: SupportedDatabasesString;
    private static db_executor: BunSQLiteDatabase<Record<string,never>> & {$client:object} | NodePgDatabase<Record<string, never>> & { $client: Pool } | null

    constructor(executor?:BunSQLiteDatabase<Record<string,never>> & {$client:object} | NodePgDatabase<Record<string, never>> & { $client: Pool }) {
        console.log("Running DAO Constructor")
        if (!DAO.type) {
            DAO.insertType();
        }

        if(executor){
            DAO.db_executor = executor;
            return;
        }

        if(DAO.type === "SQLite"){
            DAO.db_executor = new SQLiteConnector().getDB()
            return;
        }

        if(DAO.type === "Postgres"){
            DAO.db_executor = new PostgresConnector().getDB()
            return;
        }

        DAO.db_executor = null;
    }

    private static insertType() {
        const config = Configuration.getConfig();
        if (config.database.database_type === "sqlite") {
            DAO.type = "SQLite";
        } else if (config.database.database_type === "postgres") {
            DAO.type = "Postgres";
        } else {
            Logger.error(
                `Either you have not set DB_TYPE to a supported value, or you haven't set it at all`,
            );
            throw new Error(
                `Either you have not set DB_TYPE to a supported value, or you haven't set it at all`,
            );
        }
    }

    public static getExecutor():SQLiteExecutor | PgExecutor {
        if(this.db_executor === null){
            throw new Error(`BUG: The db executor is null. Cannot continue operations`)
        }
        return this.db_executor;
    }

    public static getType() {
        if (!DAO.type) {
            DAO.insertType();
        }
        return DAO.type;
    }
    public abstract insert(item: T): Promise<T>;
    public abstract update(item: T): Promise<T>;
    public abstract delete(item: T): Promise<void>;
    public abstract getById(id: string): Promise<T | null>;
    public abstract getAll(): Promise<Array<T>>;
}
