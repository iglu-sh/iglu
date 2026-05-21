import { readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { Logger } from "@iglu-sh/shared/logger";
import { Configuration, type config } from "@iglu-sh/shared/utils/cache";
import { load } from "js-toml";
import { z } from "zod";

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
    server: z.object({
        hostname: z.string(),
        hashing_secret: z.string(),
    }),
    storage: z.object({
        storage_type: z.enum(["fs"]),
        binary_storage_directory: z.string(),
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

/**
 * @description - Loads the config (at config.toml), parses it and validates it's schema, then returns it
 * @throws - On faulty config (wrong keys, wrong values, etc.)
 * @returns {config} - The Config Data
 * */
export async function load_config(
    path = resolve(`${process.env.IGLU_CWD}/config.toml`),
): Promise<config> {
    if (process.env.IGLU_CACHE_CONF) {
        if (!isAbsolute(process.env.IGLU_CACHE_CONF)) {
            process.env.IGLU_CACHE_CONF = `${process.env.IGLU_CWD}/${process.env.IGLU_CACHE_CONF}`;
        }
        path = resolve(`${process.env.IGLU_CACHE_CONF}/config.toml`);
    }

    return new Promise((resolve) => {
        const tomlString = readFileSync(path).toString();
        const config = load(tomlString);
        const zod_schema_result = config_schema.safeParse(config);
        if (!zod_schema_result.data || !zod_schema_result.success) {
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
        resolve(zod_schema_result.data);
    });
}
