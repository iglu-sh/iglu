import { readFileSync } from "node:fs";
import { Logger } from "@iglu-sh/shared/logger";
import { Configuration, type config } from "@iglu-sh/shared/utils/cache";
import { load } from "js-toml";
import { z } from "zod";
import type { StartupModule } from "../Module";
import type { env } from "./environment.module";

export const config_schema = z.object({
    database: z.object({
        database_type: z.enum(["sqlite", "postgres"]),
        database_file_location: z
            .string()
            .nullish()
            .transform((val) => val ?? "<empty>"),
        user: z
            .string()
            .nullish()
            .transform((val) => val ?? "<empty>"),
        host: z
            .string()
            .nullish()
            .transform((val) => val ?? "<empty>"),
        password: z
            .string()
            .nullish()
            .transform((val) => val ?? "<empty>"),
        port: z
            .number()
            .nullish()
            .transform((val) => val ?? -1),
        name: z
            .string()
            .nullish()
            .transform((val) => val ?? "iglu"),
    }),
    logger: z.object({
        logging_format: z.enum(["pretty", "json"]),
        log_level: z.enum(["debug", "info", "warn", "error"]),
        logging_prefix: z.string().optional(),
        logging_prefix_color: z
            .enum(["gray", "green", "yellow", "red", "blue", "magenta", "cyan", "white"])
            .optional(),
        should_log_requests: z.boolean(),
    }),
    server: z
        .object({
            hostname: z.string(),
            interface: z.ipv4().default("0.0.0.0"),
            port: z.uint32().default(80),
            hashing_secret: z.string().optional(),
            hashing_secret_file: z.string().optional(),
            enable_rest: z.boolean().default(true),
            enable_info: z.boolean().default(true),
            encryption: z.object({
                secret_file: z.string(),
                secret: z.string().default("<empty>"),
            }),
            trusted_proxies: z.array(z.ipv4()).default([]),
            use_reverse_proxy: z.boolean().default(false),
        })
        .refine(
            (data) =>
                (data.hashing_secret !== undefined) !== (data.hashing_secret_file !== undefined),
            {
                message:
                    "One and only one of server.hashing_secret_file or server.hashing_secret has to be set.",
            },
        ),
    storage: z.object({
        storage_type: z.enum(["fs", "s3"]),
        binary_storage_directory: z.string(),
        s3: z
            .object({
                endpoint: z.string(),
                access_key_id: z.string(),
                secret_access_key: z.string(),
                forcePathStyle: z.boolean().optional().default(true),
                request_checksum_calculation: z
                    .enum(["WHEN_REQUIRED", "WHEN_SUPPORTED"])
                    .optional()
                    .default("WHEN_REQUIRED"),
                response_checksum_validation: z
                    .enum(["WHEN_REQUIRED", "WHEN_SUPPORTED"])
                    .optional()
                    .default("WHEN_REQUIRED"),
                region: z.string().optional().default("us-east-1"),
                bucket: z.string(),
            })
            .optional(),
    }),
    tenants: z.object({
        create_tenants_from_config: z.boolean(),
        definitions: z.array(
            z.object({
                github_username: z.string(),
                is_public: z.boolean(),
                name: z.string(),
                preferred_compression_method: z.enum(["xz", "zstd"]),
                priority: z.number(),
                api_key_id: z.string(),
                ttl: z.string(),
                signing_method: z.enum(["client", "server"]),
            }),
        ),
    }),
    deployments: z.object({
        create_deployments_from_config: z.boolean(),
        enable_deployments: z.boolean(),
        definitions: z.array(
            z.object({
                name: z.string(),
                type: z.enum(["agent", "activate"]),
                expires_at: z.union([z.iso.datetime(), z.string()]),
                tenant_name: z.string(),
            }),
        ),
    }),
});

export const configuration: StartupModule<config> = {
    name: "configuration.module",
    description: `Validates the configuration and passes it to the Configuration class`,
    is_target: false,

    before: [],
    after: ["boot.target", "environment.module"],
    requires: ["boot.target", "environment.module"],

    timeout_ms: 1000,
    optional: false,

    enabled: async (): Promise<boolean> => {
        return true;
    },

    start: async (ctx): Promise<config> => {
        const environment: env = ctx.get("environment.module");
        const toml_string =
            environment.IGLU_CACHE_RAW_CONF ??
            readFileSync(environment.IGLU_CACHE_CONFIGURATION_PATH).toString();

        if (!toml_string) {
            throw new Error(
                "Unable to load toml from both IGLU_CACHE_RAW_CONF env or from provided file path",
            );
        }

        const config = load(toml_string);
        const zod_schema_result = config_schema.safeParse(config);

        if (!zod_schema_result.success) {
            Logger.error(
                "Panic(cache::startup::helpers::load_config):Did not successfully validate config schema, please check your config and try again",
            );
            Logger.info("Here are the errors I found with your config:");
            console.log(zod_schema_result.error.issues);
            throw new Error(
                "Panic(cache::startup::helpers::load_config):Did not successfully validate config schema, please check your config and try again",
            );
        }

        new Configuration(zod_schema_result.data);

        process.env.HOSTNAME = zod_schema_result.data.server.hostname;
        process.env.INTERFACE = zod_schema_result.data.server.interface;
        process.env.PORT = zod_schema_result.data.server.port.toString();
        process.env.STORAGE_TYPE = zod_schema_result.data.storage.storage_type;
        process.env.FILESYSTEM_DIRECTORY = zod_schema_result.data.storage.binary_storage_directory;

        return zod_schema_result.data;
    },

    stop: async (): Promise<void> => {},
};
