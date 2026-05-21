import { Logger } from "@iglu-sh/shared/logger";
import { migrate as m_sqlite } from "drizzle-orm/bun-sqlite/migrator";
import { migrate as m_postgres } from "drizzle-orm/node-postgres/migrator";
import PostgresConnector from "../../db/Connectors/Postgres.ts";
import SQLiteConnector from "../../db/Connectors/SQLite.ts";
import { Configuration } from "./Configuration.ts";

export function migrate(migration_dir: string) {
    const config = Configuration.getConfig();
    if (config.database.database_type === "sqlite") {
        Logger.info("Run sqlite migrations.");
        const db = new SQLiteConnector().getDB();
        console.log(`${migration_dir}/sqlite_drizzle`);
        m_sqlite(db, { migrationsFolder: `${migration_dir}/sqlite_drizzle` });
    } else if (config.database.database_type === "postgres") {
        Logger.info("Run postgres migrations.");
        const db = new PostgresConnector().getDB();
        m_postgres(db, { migrationsFolder: `${migration_dir}/postgres_drizzle` });
    }
}
