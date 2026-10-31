import { isAbsolute, resolve } from "node:path";
import type { allowed_compression_methods } from "../../types";

export type tenant_definition = {
    github_username: string;
    is_public: boolean;
    name: string;
    preferred_compression_method: allowed_compression_methods;
    priority: number;
    ttl: string;
    signing_method: "client" | "server";
};

export type api_key_definition = {
    out_file: string;
    in_file: string | null;
    generated: boolean | null;
    tenant: string;
    plaintext_key: string | null;
};

export type public_keys_definition = {
    name: string;
    key: string;
    linked_api_key: string;
};

export type deployment_keys_definition = {
    name: string;
    type: "agent" | "activate";
    expires_at: string;
    tenant: string;
    in_file: string | null;
    generated: boolean;
    plaintext_key: string | null;
};

export type keypair_definition = {
    signing_key: string;
    tenant: string;
    in_file: string | null;
    generated: boolean;
    plaintext_key: string | null;
};

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
        hostname?: string;
        interface: string;
        port: number;
        hashing_secret?: string | undefined;
        hashing_secret_file?: string | undefined;
        enable_rest: boolean;
        enable_info: boolean;
        encryption: {
            secret: string;
        };
        trusted_proxies: Array<string>;
        use_reverse_proxy: boolean;
    };
    storage: {
        storage_type: "fs" | "s3";
        binary_storage_directory: string;
        s3?: {
            endpoint: string;
            access_key_id: string;
            secret_access_key: string;
            forcePathStyle: boolean | true;
            request_checksum_calculation: "WHEN_SUPPORTED" | "WHEN_REQUIRED";
            response_checksum_validation: "WHEN_SUPPORTED" | "WHEN_REQUIRED";
            region: string | "us-east-1";
            bucket: string;
        };
    };

    tenants: {
        [key: string]: tenant_definition;
    };
    api_keys: {
        [key: string]: api_key_definition;
    };
    public_keys: {
        [key: string]: public_keys_definition;
    };
    deployment_keys: {
        [key: string]: deployment_keys_definition;
    };
    keypairs: {
        [key: string]: keypair_definition;
    };
};

export class Configuration {
    private static config: config;
    constructor(init_config: config) {
        Configuration.config = init_config;
        let db_file_location = Configuration.config.database.database_file_location;
        if (db_file_location !== ":memory:") {
            if (!isAbsolute(db_file_location)) {
                db_file_location = `${process.env.IGLU_CWD}/${db_file_location}`;
            }
            Configuration.config.database.database_file_location = resolve(db_file_location);
        }
    }

    public static getConfig(): config {
        return Configuration.config;
    }

    public static setConfig(config: config): void {
        Configuration.config = config;
    }
}
