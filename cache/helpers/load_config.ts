import { load } from "js-toml";
import { z } from "zod";
import { readFileSync } from "node:fs";
import Logger from "@/logger";
import type { allowed_compression_methods } from "@/db_types";

export type config = {
    database: {
        database_type: "sqlite" | "postgres";
        database_file_location: string;
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
    };
    server: {
        hostname: string,
        binary_storage_directory: string,
        hashing_secret: string
    };
    tenants:{
        create_tenants_from_config: boolean,
        definitions: Array<{
            github_username: string,
            is_public: boolean,
            name: string,
            preferred_compression_method: allowed_compression_methods,
            priority: number,
            api_key_id: string | 'generated'
        }>
    }
};

export const config_schema = z.object({
    database: z.object({
        database_type: z.enum(["sqlite", "postgres"]),
        database_file_location: z.string(),
    }),
    logger: z.object({
        logging_format: z.enum(["pretty", "json"]),
        log_level: z.enum(["debug", "info", "warn", "error"]),
        logging_prefix: z.string().optional(),
        logging_prefix_color: z
            .enum(["gray", "green", "yellow", "red", "blue", "magenta", "cyan", "white"])
            .optional(),
    }),
    server: z.object({
        hostname: z.string(),
        binary_storage_directory: z.string(),
        hashing_secret: z.string()
    }),
    tenants: z.object({
        create_tenants_from_config: z.boolean(),
        definitions: z.array(z.object({
            github_username: z.string(),
            is_public: z.boolean(),
            name: z.string(),
            preferred_compression_method: z.enum(["xz", 'zstd']),
            priority: z.number(),
            api_key_id: z.string()
        }))
    })
});

/**
 * @description - Loads the config (at config.toml), parses it and validates it's schema, then returns it
 * @throws - On faulty config (wrong keys, wrong values, etc.)
 * @returns {config} - The Config Data
 * */
export async function load_config(): Promise<config> {
    const tomlString = readFileSync("./config.toml").toString();
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
    return zod_schema_result.data;
}
