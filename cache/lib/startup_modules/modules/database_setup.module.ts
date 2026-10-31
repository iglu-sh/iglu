import type { config } from "@iglu-sh/shared/utils/cache";
import type { StartupModule } from "../Module";

export const database_setup_module: StartupModule<void> = {
    name: "database_setup.module",
    description: "Sets up anything that may be required for the database migrations to run",
    is_target: false,

    before: ["database.target"],
    requires: ["configuration.module"],
    after: ["configuration.module"],

    timeout_ms: 10,
    optional: false,

    enabled: async () => {
        return true;
    },

    start: async (ctx) => {
        const config = ctx.get("configuration.module") as config;

        process.env.DB_TYPE = config.database.database_type;
        if (config.database.database_type === "sqlite") {
            process.env.DB_FILE_NAME = config.database.database_file_location;
        }
    },

    stop: async () => {},
};
