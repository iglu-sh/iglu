import { Configuration } from "../../../shared/utils/cache/Configuration";

export function setupConfig() {
    new Configuration({
        database: {
            database_type: "sqlite",
            database_file_location: ":memory:",
            user: "",
            host: "",
            password: "",
            port: 0,
            name: "",
        },
        logger: {
            logging_format: "pretty",
            log_level: "warn",
            logging_prefix: "Test",
            logging_prefix_color: "blue",
            should_log_requests: true,
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
}
