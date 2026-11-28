import type { database_version, declarative_versioned_tenant } from "@iglu-sh/shared";
import { Logger } from "@iglu-sh/shared/logger";
import type { config, keypair_definition, tenant_definition } from "@iglu-sh/shared/utils/cache";
import type { StartupModule } from "../Module";
import type { planning_type } from "../Planning";

export const declarative_tenant_module: StartupModule<planning_type<declarative_versioned_tenant>> =
    {
        name: "declarative-tenant.module",
        description: `Plans how to change the tenants in the database`,
        is_target: false,
        optional: false,
        timeout_ms: 0,
        before: [],
        requires: ["declarative-version.module", "database.target"],
        after: ["declarative-version.module", "database.target"],
        async enabled(ctx): Promise<boolean> {
            const config = ctx.get("configuration.module") as config;
            // Only enable this module if reconcile is even enabled
            return config.config.reconcile.mode !== "off";
        },
        async start(ctx): Promise<planning_type<declarative_versioned_tenant>> {
            const latest_version = ctx.get("declarative-version.module") as database_version;
            const configuration = ctx.get("configuration.module") as config;

            const all_tenants_configured = Object.keys(configuration.tenants);

            const return_object: planning_type<declarative_versioned_tenant> = {
                new: [],
                modified: [],
                deleted: [],
                unchanged: [],
            };

            // Go over each configured tenant and check if they were present in the latest version
            // If they weren't, then we can add them into the "new" array
            // If they were changed since the last version, we need to add them to the "modified" array
            // and so on...
            for (const tenant_name of all_tenants_configured) {
                const config_value = configuration.tenants[tenant_name];

                if (!config_value) {
                    Logger.debug(
                        `BUG: Unable to retrieve config value for config tenant: ${tenant_name}`,
                    );
                    continue;
                }

                const latest_version_value = latest_version.state.tenants.filter((x) => {
                    return x.mapped_from === tenant_name;
                });

                // Check that, if this tenant is supposed to use server side signing, there is a keypair configured that references this tenant
                if (config_value.signing_method === "server") {
                    const all_configured_keypairs = configuration.keypairs;
                    let tenant_is_referenced = false;
                    for (const keypair_name of Object.keys(all_configured_keypairs)) {
                        const keypair = all_configured_keypairs[keypair_name] as keypair_definition;
                        if (keypair.tenant === tenant_name && tenant_is_referenced) {
                            Logger.error(
                                `Error: The Tenant ${tenant_name} has multiple Server-Side Keypairs configured. It may only have one configured`,
                            );
                            throw new Error(
                                `Error: The Tenant ${tenant_name} has multiple Server-Side Keypairs configured. It may only have one configured`,
                            );
                        }
                        if (keypair.tenant === tenant_name) {
                            tenant_is_referenced = true;
                        }
                    }
                    if (!tenant_is_referenced) {
                        Logger.error(
                            `Error: The Tenant ${tenant_name} does not have a Server-Side Signing Keypair Configured, but it has the signing_method option set to 'server'. Please either configure a keypair (recommended) or set the signing_method to 'client' (unrecommended)`,
                        );
                        throw new Error(
                            `Error: The Tenant ${tenant_name} does not have a Server-Side Signing Keypair Configured, but it has the signing_method option set to 'server'. Please either configure a keypair (recommended) or set the signing_method to 'client' (unrecommended)`,
                        );
                    }
                }

                // In this case the tenant does not yet exist in the database
                if (latest_version_value.length === 0 || !latest_version_value[0]) {
                    Logger.debug(`Found new tenant NOT in latest version with name ${tenant_name}`);
                    return_object.new.push({
                        ...config_value,
                        mapped_from: tenant_name,
                        id: "n/a",
                        managed_by: "configuration",
                        uri: `${configuration.server.hostname}/${tenant_name}`,
                        permission: "Public",
                    });
                    continue;
                }

                // This means we've found a configured tenant that was mapped from the config to a value in the latest version
                // This checks if there was a modification between the latest version and the configuration
                const latest_version_as_config_value: tenant_definition = {
                    github_username: latest_version_value[0].github_username,
                    is_public: latest_version_value[0].is_public,
                    preferred_compression_method:
                        latest_version_value[0].preferred_compression_method,
                    priority: latest_version_value[0].priority,
                    ttl: latest_version_value[0].ttl,
                    signing_method: latest_version_value[0].signing_method,
                };

                if (
                    latest_version_as_config_value.ttl !== config_value.ttl ||
                    latest_version_as_config_value.github_username !==
                        config_value.github_username ||
                    latest_version_as_config_value.priority !== config_value.priority ||
                    latest_version_as_config_value.is_public !== config_value.is_public ||
                    latest_version_as_config_value.signing_method !== config_value.signing_method ||
                    latest_version_as_config_value.preferred_compression_method !==
                        config_value.preferred_compression_method
                ) {
                    return_object.modified.push({
                        ...latest_version_value[0],
                        ...config_value,
                    });
                    continue;
                }

                // If all of this has not done anything, push the value to the "unchanged" array
                return_object.unchanged.push(latest_version_value[0]);
            }

            // As a last step we filter out all tenants configured in the latest version that are no longer in the configuration
            const deleted_tenants = latest_version.state.tenants.filter((x) => {
                if (!all_tenants_configured.includes(x.mapped_from)) {
                    return true;
                }
                return false;
            });

            return_object.deleted = deleted_tenants;

            return return_object;
        },
        async stop(): Promise<void> {},
    };
