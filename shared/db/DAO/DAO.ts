import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import type { NodePgDatabase, NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { SQLiteTransaction } from "drizzle-orm/sqlite-core";
import type { Pool } from "pg";
import Logger from "../../logger/Logger";
import { Configuration } from "../../utils/cache/Configuration";
import PostgresConnector from "../Connectors/Postgres";
import SQLiteConnector from "../Connectors/SQLite";

export type SupportedDatabasesString = "SQLite" | "Postgres";
export type SQLiteExecutor =
    | (BunSQLiteDatabase<Record<string, never>> & { $client: object })
    | SQLiteTransaction<
          "sync",
          void,
          Record<string, never>,
          ExtractTablesWithRelations<Record<string, never>>
      >;
export type PgExecutor =
    | (NodePgDatabase<Record<string, never>> & { $client: Pool })
    | PgTransaction<
          NodePgQueryResultHKT,
          Record<string, never>,
          ExtractTablesWithRelations<Record<string, never>>
      >;

export abstract class DAO<T> {
    private static type: SupportedDatabasesString;
    private static db_executor: SQLiteExecutor | PgExecutor | null = null;
    constructor(executor?: SQLiteExecutor | PgExecutor) {
        if (!DAO.type) {
            DAO.insertType();
        }

        if (executor) {
            DAO.db_executor = executor;
            return;
        }

        DAO.db_executor = null;
    }

    private static insertType(): Promise<void> {
        return new Promise((resolve) => {
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
            resolve();
        });
    }

    public static getExecutor(): SQLiteExecutor | PgExecutor {
        if (!DAO.db_executor) {
            const type = DAO.getType();
            if (type === "SQLite") DAO.db_executor = new SQLiteConnector().getDB();
            else if (type === "Postgres") DAO.db_executor = new PostgresConnector().getDB();
        }
        if (!DAO.db_executor || DAO.db_executor === null) {
            throw new Error(`BUG: The db executor is null. Cannot continue operations`);
        }

        return DAO.db_executor;
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
