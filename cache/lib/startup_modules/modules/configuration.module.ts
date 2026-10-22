import { readFileSync } from "node:fs";
import { Logger } from "@iglu-sh/shared/logger";
import { Configuration, type config } from "@iglu-sh/shared/utils/cache";
import { config_schema } from "@iglu-sh/shared/utils/zod/zod_config_schema";
import { load } from "js-toml";
import type { StartupModule } from "../Module";
import type { env } from "./environment.module";

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
