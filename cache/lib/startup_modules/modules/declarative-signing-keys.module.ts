import type { database_version, declarative_versioned_public_key } from "@iglu-sh/shared";
import type { config } from "@iglu-sh/shared/utils/cache";
import { Logger } from "@/shared/logger";
import type { StartupModule } from "../Module";
import type { planning_type } from "../Planning";

export const declarative_signing_key_module: StartupModule<
    planning_type<declarative_versioned_public_key>
> = {
    name: "declarative-signing-keys.module",
    description: "Plans how to change the signing keys in the database",

    is_target: false,
    optional: false,

    timeout_ms: 0,

    before: [],
    requires: ["declarative-version.module", "database.target", "configuration.module"],
    after: ["declarative-version.module", "database.target", "configuration.module"],
    async enabled(ctx): Promise<boolean> {
        const config = ctx.get("configuration.module") as config;
        // Only enable this module if reconcile is even enabled
        return config.config.reconcile.mode !== "off";
    },

    async start(ctx): Promise<planning_type<declarative_versioned_public_key>> {
        const latest_version = ctx.get("declarative-version.module") as database_version;
        const config = ctx.get("configuration.module") as config;

        const all_configured_signing_keys = Object.keys(config.public_keys);

        const return_object: planning_type<declarative_versioned_public_key> = {
            new: [],
            modified: [],
            deleted: [],
            unchanged: [],
        };

        for (const signing_key_name of all_configured_signing_keys) {
            const config_value = config.public_keys[signing_key_name];

            if (!config_value) {
                Logger.debug(
                    `BUG: Unable to retrieve config value for signing key: ${signing_key_name}`,
                );
                continue;
            }

            // Check if the linked_api_key exists in the config
            if (!config.api_keys[config_value.linked_api_key]) {
                Logger.error(
                    `Config Error: The public key ${signing_key_name}, which is referencing the API Key ${config_value.linked_api_key} which does not exist in the configuration`,
                );
                throw new Error(
                    `Config Error: The public key ${signing_key_name}, which is referencing the API Key ${config_value.linked_api_key} which does not exist in the configuration`,
                );
            }

            const latest_version_value = latest_version.state.public_keys.filter((x) => {
                return x.mapped_from === signing_key_name;
            });

            // In this case the signing key does not yet exist in the database
            if (latest_version_value.length === 0 || !latest_version_value[0]) {
                Logger.debug(`Found key NOT in latest database version: ${signing_key_name}`);
                return_object.new.push({
                    id: "n/a",
                    key: config_value.key,
                    mapped_from: signing_key_name,
                    name: signing_key_name,
                    managed_by: "configuration",
                    linked_api_key: config_value.linked_api_key,
                    api_keys_id: {
                        id: "n/a",
                        name: "n/a",
                        hash: "n/a",
                        managed_by: "other",
                    },
                });
                continue;
            }

            // In this case we need to check if anything differs from the latest version stored in the database
            if (
                latest_version_value[0].key !== config_value.key ||
                latest_version_value[0].name !== config_value.name ||
                latest_version_value[0].linked_api_key !== config_value.linked_api_key
            ) {
                return_object.modified.push({
                    ...latest_version_value[0],
                    key: config_value.key,
                    name: config_value.name,
                    linked_api_key: config_value.linked_api_key,
                });
                continue;
            }

            return_object.unchanged.push(latest_version_value[0]);
        }

        const deleted_signing_key = latest_version.state.public_keys.filter((x) => {
            if (!all_configured_signing_keys.includes(x.mapped_from)) {
                return true;
            }
            return false;
        });

        return_object.deleted = deleted_signing_key;

        return return_object;
    },

    async stop(): Promise<void> {},
};
