import Configuration from "@/cache/lib/Configuration";

export function setupMockConfiguration() {
    new Configuration({
        database: {
            database_type: "sqlite",
            database_file_location: ":memory:",
        },
        logger: {
            logging_format: "pretty",
            log_level: "warn",
            logging_prefix: "test",
        },
        server: {
            hostname: "https://iglu.example.com",
            hashing_secret: "very secure",
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
