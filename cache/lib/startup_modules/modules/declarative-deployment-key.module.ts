import { randomBytes } from "node:crypto";
import { appendFileSync } from "node:fs";
import type { database_version, declarative_versioned_deployment_key } from "@iglu-sh/shared";
import { Logger } from "@iglu-sh/shared/logger";
import type { config } from "@iglu-sh/shared/utils/cache";
import { hashApiKey } from "@/shared/utils";
import type { StartupModule } from "../Module";
import type { planning_type } from "../Planning";

export const declarative_deployment_key_module: StartupModule<
    planning_type<declarative_versioned_deployment_key>
> = {
    name: "declarative-deployment-key.module",
    description: `Plans how to change th deployment keys in the database`,

    is_target: false,
    optional: false,

    timeout_ms: 0,

    before: [],
    requires: ["declarative-version.module", "database.target", "encryption.module"],
    after: ["declarative-version.module", "database.target", "encryption.module"],

    async enabled(ctx): Promise<boolean> {
        const config = ctx.get("configuration.module") as config;
        // Only enable this module if reconcile is even enabled
        return config.config.reconcile.mode !== "off";
    },

    async start(ctx): Promise<planning_type<declarative_versioned_deployment_key>> {
        const latest_version = ctx.get("declarative-version.module") as database_version;
        const configuration = ctx.get("configuration.module") as config;

        const all_deployment_keys = Object.keys(configuration.deployment_keys);

        const return_object: planning_type<declarative_versioned_deployment_key> = {
            new: [],
            modified: [],
            deleted: [],
            unchanged: [],
        };

        // Go over each configured deployment key and check if they were present in the latest version
        // If they weren't, then we can add them into the "new" array
        // If they were changed since the last version, we need to add them to the "modified" array
        // and so on...
        for (const deployment_key_name of all_deployment_keys) {
            const config_value = configuration.deployment_keys[deployment_key_name];

            if (!config_value) {
                Logger.debug(
                    `BUG: Unable to retrieve config value for config tenant: ${deployment_key_name}`,
                );
                continue;
            }

            if (!configuration.tenants[config_value.tenant]) {
                Logger.error(
                    `Error: The deployment key ${deployment_key_name} is referencing an undefined tenant "${config_value.tenant}"`,
                );
                throw new Error(
                    `Error: The deployment key ${deployment_key_name} is referencing an undefined tenant "${config_value.tenant}"`,
                );
            }

            const latest_version_value = latest_version.state.deployment_keys.filter((x) => {
                return x.mapped_from === deployment_key_name;
            });

            if (latest_version_value.length === 0 || !latest_version_value[0]) {
                Logger.debug(
                    `Found a new deployment key not in the latest database version: ${deployment_key_name}`,
                );

                let key = config_value.plaintext_key;

                if (key === null && config_value.in_file !== null) {
                    key = await Bun.file(config_value.in_file).text();
                }

                if (key === null && config_value.out_file !== null && config_value.generated) {
                    key = Buffer.from(randomBytes(48)).toHex();
                    appendFileSync(
                        config_value.out_file,
                        `\n[deployment_${deployment_key_name}]\ndeployment_key="${key}"`,
                    );
                }

                if (key === null && config_value.out_file === null && config_value.generated) {
                    Logger.warn(
                        `The deployment_key ${deployment_key_name} has set generated = 'true', however there isn't an out_file set on this same deployment key. This will result in the key NOT being generated, set an out_file to get your deployment key.`,
                    );
                }

                // If the key is still null here
                if (key === null) {
                    Logger.error(
                        `The key ${deployment_key_name} does not have any method correctly set up to insert a deployment key. If you do not want to provide your own, set 'generated' to 'true' and let iglu create one for you`,
                    );
                    throw new Error(
                        `The key ${deployment_key_name} does not have any method correctly set up to insert a deployment key. If you do not want to provide your own, set 'generated' to 'true' and let iglu create one for you`,
                    );
                }

                Logger.debug(
                    `Found new deployment key NOT in latest version with name: ${deployment_key_name}`,
                );

                return_object.new.push({
                    id: "n/a",
                    in_file: config_value.in_file,
                    out_file: config_value.out_file,
                    generated: config_value.generated,
                    tenant: config_value.tenant,
                    managed_by: "configuration",
                    type: config_value.type,
                    mapped_from: deployment_key_name,
                    hash: hashApiKey(key),
                    name: deployment_key_name,
                    created_at: Date.now(),
                    expires_at: Date.parse(config_value.expires_at),
                    tenants_id: {
                        id: "n/a",
                        github_username: "n/a",
                        name: config_value.tenant,
                        permission: "n/a",
                        is_public: false,
                        preferred_compression_method: "n/a",
                        uri: "n/a",
                        priority: 1,
                        ttl: 0,
                        signing_method: "client",
                        managed_by: "other",
                    },
                });
                continue;
            }

            let key = config_value.plaintext_key;

            if (key === null && config_value.in_file !== null) {
                key = await Bun.file(config_value.in_file).text();
            }

            let hash_of_key = null;
            if (key !== null) {
                hash_of_key = hashApiKey(key);
            }

            // If we are here this means that we need to check if something changed since the last version
            // Check if any of the configured values differ
            if (
                config_value.tenant !== latest_version_value[0].tenant ||
                Date.parse(config_value.expires_at) !== latest_version_value[0].expires_at ||
                config_value.in_file !== latest_version_value[0].in_file ||
                (key !== null &&
                    hash_of_key !== null &&
                    hash_of_key === latest_version_value[0].hash) ||
                config_value.type !== latest_version_value[0].type ||
                config_value.name !== latest_version_value[0].name
            ) {
                return_object.modified.push({
                    ...latest_version_value[0],
                    tenant: config_value.tenant,
                    expires_at: Date.parse(config_value.expires_at),
                    in_file: config_value.in_file,
                    hash: hash_of_key ?? latest_version_value[0].hash,
                    type: config_value.type,
                    name: config_value.name,
                });

                continue;
            }

            return_object.unchanged.push(latest_version_value[0]);
        }

        const deleted_tenants = latest_version.state.deployment_keys.filter((x) => {
            if (!all_deployment_keys.includes(x.mapped_from)) {
                return true;
            }

            return false;
        });

        return_object.deleted = deleted_tenants;

        return return_object;
    },

    async stop() {},
};
