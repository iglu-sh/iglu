import { resolve } from "node:path";
import SQLiteConnector from "@iglu-sh/shared/db/Connectors/SQLite";
import { Logger } from "@iglu-sh/shared/logger";
import type { config } from "@iglu-sh/shared/utils/cache";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import type { StartupModule } from "../Module";

export const sqlite_migrations_module: StartupModule<void> = {
    name: "sqlite_migrations.module",
    description: "Migrates the given Database File",
    is_target: false,

    before: ["database.target"],
    requires: ["configuration.module", "database_setup.module"],
    after: ["database_setup.module"],

    timeout_ms: 1000,
    optional: false,

    enabled: async (ctx) => {
        const config = ctx.get("configuration.module") as config;

        // Only run this module if the database type is actually sqlite
        return config.database.database_type === "sqlite";
    },

    start: async () => {
        Logger.info(`Running SQLite Migrations`);
        const db = new SQLiteConnector().getDB();
        const path = resolve("./drizzle/sqlite_drizzle");
        Logger.debug(`Folder to sqlite migrations: ${path}`);
        migrate(db, { migrationsFolder: path });
    },

    stop: async () => {},
};
