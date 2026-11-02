import type { database_version, declarative_versioned_keypair } from "@iglu-sh/shared";
import { Logger } from "@iglu-sh/shared/logger";
import type { config } from "@iglu-sh/shared/utils/cache";
import { decrypt_key, encrypt_key } from "@iglu-sh/shared/utils/crypto/encrypt_decrypt_keypair";
import type { StartupModule } from "../Module";
import type { planning_type } from "../Planning";

export const declarative_keypairs_module: StartupModule<
    planning_type<declarative_versioned_keypair>
> = {
    name: "declarative-keypair.module",
    description: `Plans how to change the keypairs in the database`,

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

    async start(ctx): Promise<planning_type<declarative_versioned_keypair>> {
        const latest_version = ctx.get("declarative-version.module") as database_version;
        const configuration = ctx.get("configuration.module") as config;

        const all_keypairs_configured = Object.keys(configuration.keypairs);

        const return_object: planning_type<declarative_versioned_keypair> = {
            new: [],
            modified: [],
            deleted: [],
            unchanged: [],
        };

        // Go over each configured keypair and check if they were present in the latest version
        // If they weren't, then we can add them into the "new" array
        // If they were changed since the last version, we need to add them to the "modified" array
        // and so on...
        for (const keypair_name of all_keypairs_configured) {
            const config_value = configuration.keypairs[keypair_name];

            if (!config_value) {
                Logger.debug(
                    `BUG: Unable to retrieve config value for config tenant: ${keypair_name}`,
                );
                continue;
            }

            if (!configuration.tenants[config_value.tenant]) {
                Logger.error(
                    `Config validation error: The keypair "${keypair_name}" references the non-existant tenant "${config_value.tenant}"`,
                );
                throw new Error(
                    `Config validation error: The keypair "${keypair_name}" references the non-existant tenant "${config_value.tenant}"`,
                );
            }

            if (!configuration.public_keys[config_value.signing_key]) {
                Logger.error(
                    `Config validation error: The keypair "${keypair_name}" references the non-existant signing key "${config_value.signing_key}"`,
                );
            }

            const latest_version_value = latest_version.state.keypairs.filter((x) => {
                return x.mapped_from === keypair_name;
            });

            if (latest_version_value.length === 0 || !latest_version_value[0]) {
                let key = config_value.plaintext_key;
                if (key === null && config_value.in_file !== null) {
                    key = await Bun.file(config_value.in_file).text();
                }

                // If the key is still null here, then we throw an error
                if (key === null && !config_value.generated) {
                    throw new Error(
                        `The keypair ${keypair_name} does NOT have a method configured to read in the key. If you do not want to provide the key yourself, set the 'generated' option to 'true'`,
                    );
                }

                // Here, we need to check the size of the key buffer
                if (key !== null && Buffer.from(key).length !== 32) {
                    throw new Error(
                        `The keypair ${keypair_name} has a key configured that does not decode to exactly 32 Bytes. This is an invalid ed25519 key!`,
                    );
                }

                Logger.debug(`Found new keypair NOT in latest version with name ${keypair_name}`);
                return_object.new.push({
                    id: "n/a",
                    in_file: config_value.in_file,
                    generated: config_value.generated,
                    tenant: config_value.tenant,
                    managed_by: "configuration",
                    mapped_from: keypair_name,
                    signing_key: config_value.signing_key,
                    tenants_id: {
                        id: "n/a",
                        github_username: "n/a",
                        name: "n/a",
                        is_public: false,
                        permission: "n/a",
                        preferred_compression_method: "n/a",
                        managed_by: "other",
                        uri: "n/a",
                        ttl: -1,
                        priority: 0,
                        signing_method: "client",
                    },
                    private_key: encrypt_key(key ?? "<not-configured-yet>"),
                    signing_keys_id: {
                        id: "n/a",
                        name: "n/a",
                        key: "n/a",
                        api_keys_id: {
                            id: "n/a",
                            name: "n/a",
                            hash: "n/a",
                            managed_by: "other",
                        },
                        managed_by: "other",
                    },
                });

                continue;
            }

            const key_in_latest_version = decrypt_key(latest_version_value[0].private_key);

            let key_in_config = config_value.plaintext_key;

            if (key_in_config === null && config_value.in_file !== null) {
                key_in_config = await Bun.file(config_value.in_file).text();
            }

            // If the key in config is null then we do not compare the key in latest version to it
            let key_changed = false;
            if (key_in_config !== null && key_in_latest_version !== key_in_config) {
                key_changed = true;
            }

            if (
                key_changed ||
                latest_version_value[0].in_file !== config_value.in_file ||
                config_value.generated !== latest_version_value[0].generated ||
                config_value.signing_key !== latest_version_value[0].signing_key ||
                config_value.tenant !== latest_version_value[0].tenant
            ) {
                return_object.modified.push({
                    ...latest_version_value[0],
                    generated: config_value.generated,
                    signing_key: config_value.signing_key,
                    tenant: config_value.tenant,
                });
                continue;
            }

            return_object.unchanged.push(latest_version_value[0]);
        }

        const deleted_keypairs = latest_version.state.keypairs.filter((x) => {
            if (!all_keypairs_configured.includes(x.mapped_from)) {
                return true;
            }
            return false;
        });

        return_object.deleted = deleted_keypairs;

        return return_object;
    },

    async stop(): Promise<void> {},
};
