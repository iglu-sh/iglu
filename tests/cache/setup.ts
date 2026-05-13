/**
 * This file sets up the test environment and is run before every test
 * */

import Configuration from "@/cache/lib/Configuration";
import Logger from "@/logger";
import { setupDatabase } from "../shared/daos/utils";

Logger.setJsonLogging(false);
Logger.setPrefix("Test");
Logger.setLogLevel("WARN");

process.env.HOSTNAME = "https://iglu.example.com";
process.env.STORAGE_TYPE = "fs";
process.env.FILESYSTEM_DIRECTORY = "/tmp/iglu";
new Configuration({
    database: {
        database_type: "sqlite",
        database_file_location: ":memory:",
    },
    logger: {
        logging_format: "pretty",
        log_level: "warn",
        logging_prefix: "Test",
        logging_prefix_color: "blue",
    },
    server: {
        hostname: "https://iglu.example.com",
        hashing_secret: "something_secure",
    },
    storage: {
        storage_type: "fs",
        binary_storage_directory: "/tmp/iglu",
    },
    tenants: {
        create_tenants_from_config: false,
        definitions: [],
    },
    deployments: {
        create_deployments_from_config: false,
        enable_deployments: true,
        definitions: [],
    },
});
await setupDatabase("SQLite");
