import "dotenv/config";
import Logger from "@/logger";
import type { AvailablePrefixColors } from "@/logger";
import { load_config } from "./helpers/load_config";
import Tenants from "../shared/db/DAO/tenants";

/*
 * This function runs the startup routine for the cache. It checks the environment variables and creates Database Configuration. It also initizializes the logger.
 * */
export default async function startup() {
    Logger.debug("Loading config");
    const config = await load_config();
    Logger.debug("Config loaded");

    /*
     * Initializing the logger
     * */
    Logger.setJsonLogging(config.logger.logging_format === "json");
    if (config.logger.logging_prefix) {
        Logger.setPrefix(
            config.logger.logging_prefix,
            config.logger.logging_prefix_color
                ? (config.logger.logging_prefix_color.toUpperCase() as AvailablePrefixColors)
                : undefined,
        );
    }
    Logger.setLogLevel(
        config.logger.log_level.toUpperCase() as "DEBUG" | "INFO" | "WARN" | "ERROR",
    );
    Logger.info("Logger initialized!");

    /*
     * DB Setup
     * */
    process.env.DB_TYPE = config.database.database_type;
    if (config.database.database_type === "sqlite") {
        process.env.DB_FILE_NAME = config.database.database_file_location;
    }

    /*
     * Checking if default tenant exists
     * */
    const all_tenants = await new Tenants().getAll();
    if (all_tenants.length === 0) {
        Logger.info("Did not find a tenant, creating a default one");
        await new Tenants()
            .insert({
                id: "",
                uri: "/default",
                name: "default",
                is_public: true,
                priority: 40,
                permission: "ReadWrite",
                github_username: "unknown",
                preferred_compression_method: "XZ",
            })
            .then((out) => {
                Logger.debug(`Created tenant with ID: ${out.id}`);
            });
    }
}
