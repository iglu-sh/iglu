import { isAbsolute, resolve } from "node:path";
import type { allowed_compression_methods } from "../../types";

export type config = {
    database: {
        database_type: "sqlite" | "postgres";
        database_file_location: string;
        user: string;
        host: string;
        password: string;
        name: string;
        port: number;
    };
    logger: {
        logging_format: "pretty" | "json";
        log_level: "debug" | "info" | "warn" | "error";
        logging_prefix?: string | undefined;
        logging_prefix_color?:
            | "gray"
            | "green"
            | "yellow"
            | "red"
            | "blue"
            | "magenta"
            | "cyan"
            | "white";
        should_log_requests: boolean;
    };
    server: {
        hostname: string;
        hashing_secret: string;
    };
    storage: {
        storage_type: "fs";
        binary_storage_directory: string;
    };
    tenants: {
        create_tenants_from_config: boolean;
        definitions: Array<{
            github_username: string;
            is_public: boolean;
            name: string;
            preferred_compression_method: allowed_compression_methods;
            priority: number;
            api_key_id: string | "generated";
            ttl: string;
        }>;
    };
    deployments: {
        create_deployments_from_config: boolean;
        enable_deployments: boolean;
        definitions: Array<{
            name: string;
            type: "agent" | "activate";
            expires_at: "-1" | string;
            tenant_name: string;
        }>;
    };
};

export class Configuration {
    private static config: config;
    constructor(init_config: config) {
        Configuration.config = init_config;
        let db_file_location = Configuration.config.database.database_file_location;
        if (db_file_location !== ":memory:") {
            if (!isAbsolute(db_file_location)) {
                console.log(process.env.IGLU_CWD);
                db_file_location = process.env.IGLU_CWD + db_file_location;
            }
            Configuration.config.database.database_file_location = resolve(db_file_location);
        }
    }

    public static getConfig(): config {
        return Configuration.config;
    }
}
