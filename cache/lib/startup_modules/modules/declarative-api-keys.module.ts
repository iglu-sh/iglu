import { randomBytes } from "node:crypto";
import { appendFileSync } from "node:fs";
import type { database_version, declarative_versioned_api_key } from "@iglu-sh/shared";
import { Logger } from "@iglu-sh/shared/logger";
import { hashApiKey } from "@iglu-sh/shared/utils";
import type { config } from "@iglu-sh/shared/utils/cache";
import type { StartupModule } from "../Module";
import type { planning_type } from "../Planning";

export const declarative_api_keys: StartupModule<planning_type<declarative_versioned_api_key>> = {
    name: "declarative-api-keys.module",
    description: "Plans how to change the API Keys in the database",
    is_target: false,

    before: [],
    requires: ["declarative-version.module", "database.target"],
    after: ["declarative-version.module", "database.target"],

    timeout_ms: 10,
    optional: false,

    enabled: async (ctx) => {
        const config = ctx.get("configuration.module") as config;
        // Only enable this module if reconcile is even enabled
        return config.config.reconcile.mode !== "off";
    },

    start: async (ctx): Promise<planning_type<declarative_versioned_api_key>> => {
        const latest_version = ctx.get("declarative-version.module") as database_version;
        const config = ctx.get("configuration.module") as config;

        const all_configured_api_keys = Object.keys(config.api_keys);

        const return_object: planning_type<declarative_versioned_api_key> = {
            new: [],
            modified: [],
            deleted: [],
            unchanged: [],
        };

        // Go over each configured api key and check if they were present in the latest version
        for (const api_key_name of all_configured_api_keys) {
            const config_value = config.api_keys[api_key_name];

            if (!config_value) {
                Logger.debug(
                    `BUG: Unable to retrieve config value for config api key: ${api_key_name}`,
                );
                continue;
            }

            const latest_version_value = latest_version.state.api_keys.filter((x) => {
                return x.mapped_from === api_key_name;
            });

            let actual_key = config_value.plaintext_key;
            let skip_hash_validation = false;

            if (config_value.in_file !== null) {
                const file_reference = Bun.file(config_value.in_file);

                // This means the in file was probably removed, we'll set the skip_hash_validation to true so later parts of the program can handle this as they see fit
                if (!(await file_reference.exists())) {
                    skip_hash_validation = true;
                } else {
                    actual_key = await file_reference.text();
                }
            }

            // In this case the api key does not yet exist in the database
            if (latest_version_value.length === 0 || !latest_version_value[0]) {
                // In this case we need to generate a new key
                if (config_value.generated) {
                    if (!(await Bun.file(config_value.out_file).exists())) {
                        await Bun.file(config_value.out_file).write("\n");
                    }
                    actual_key = Buffer.from(randomBytes(48)).toHex();
                    appendFileSync(
                        config_value.out_file,
                        `\n[${api_key_name}]\napi_key="${actual_key}"`,
                    );
                    Logger.info(
                        `Wrote the API Key "${api_key_name}" to the file ${config_value.out_file}`,
                    );
                }

                if (actual_key === null) {
                    throw new Error(
                        `The defined API Key ${api_key_name} does not have any API Key defined. Set generated to true on the api key definition to avoid this.`,
                    );
                }

                Logger.debug(`Found new api key NOT in latest version with name ${api_key_name}`);
                return_object.new.push({
                    id: "n/a",
                    mapped_from: api_key_name,
                    name: api_key_name,
                    managed_by: "configuration",
                    out_file: config_value.out_file,
                    in_file: config_value.in_file,
                    generated: config_value.generated,
                    tenant: config_value.tenant,
                    hash: hashApiKey(actual_key),
                });
                continue;
            }

            // If we are here this means that we need to check if something changed since the last version
            // Check if any of the configured values differ
            if (
                config_value.tenant !== latest_version_value[0].tenant ||
                config_value.in_file !== latest_version_value[0].in_file ||
                (!skip_hash_validation &&
                    actual_key &&
                    hashApiKey(actual_key) !== latest_version_value[0].hash)
            ) {
                return_object.modified.push({
                    id: latest_version_value[0].id,
                    mapped_from: latest_version_value[0].mapped_from,
                    name: api_key_name,
                    managed_by: "configuration",
                    out_file: latest_version_value[0].out_file,
                    in_file: config_value.in_file,
                    generated: config_value.generated,
                    tenant: config_value.tenant,
                    hash: actual_key ? hashApiKey(actual_key) : latest_version_value[0].hash,
                });
                continue;
            }

            return_object.unchanged.push(latest_version_value[0]);
        }
        const deleted_tenants = latest_version.state.api_keys.filter((x) => {
            if (!all_configured_api_keys.includes(x.mapped_from)) {
                return true;
            }
            return false;
        });

        return_object.deleted = deleted_tenants;

        return return_object;
    },

    stop: async () => {},
};
