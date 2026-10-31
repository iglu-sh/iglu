import { readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { Logger } from "@iglu-sh/shared/logger";
import { Configuration } from "@iglu-sh/shared/utils/cache";
import type { config } from "@iglu-sh/shared/utils/cache/Configuration";
import { config_schema } from "@iglu-sh/shared/utils/zod/zod_config_schema";
import { load } from "js-toml";

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
        path = process.env.IGLU_CACHE_CONF;
    }

    return new Promise((resolve) => {
        const tomlString = process.env.IGLU_CACHE_RAW_CONF ?? readFileSync(path).toString();

        if (!tomlString) {
            Logger.error(
                "Unable to load toml from both IGLU_CACHE_RAW_CONF env or from provided file path",
            );
            process.exit(1);
        }

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
