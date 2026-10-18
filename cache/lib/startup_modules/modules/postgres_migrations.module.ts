import { resolve } from "node:path";
import { Logger } from "@iglu-sh/shared/logger";
import type { config } from "@iglu-sh/shared/utils/cache";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import PostgresConnector from "@/shared/db/Connectors/Postgres";
import type { StartupModule } from "../Module";

export const postgres_migrations_module: StartupModule<void> = {
    name: "postgres_migrations.module",
    description: "Migrates the given Postgres File",
    is_target: false,

    before: ["database.target"],
    requires: ["configuration.module", "database_setup.module"],
    after: ["database_setup.module"],

    timeout_ms: 1000,
    optional: false,

    enabled: async (ctx) => {
        const config = ctx.get("configuration.module") as config;

        // Only run this module if the database type is actually sqlite
        return config.database.database_type === "postgres";
    },

    start: async () => {
        Logger.info(`Running Postgres Migrations`);
        const db = new PostgresConnector().getDB();
        const path = resolve("./drizzle/postgres_drizzle");
        Logger.debug(`Folder to postgres migrations: ${path}`);
        await migrate(db, { migrationsFolder: path });
    },

    stop: async () => {},
};
