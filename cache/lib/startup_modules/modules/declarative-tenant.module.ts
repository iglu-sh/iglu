import type { config, tenant_definition } from "@iglu-sh/shared/utils/cache";
import type { database_version, declarative_versioned_tenant } from "@/shared";
import { Logger } from "@/shared/logger";
import type { StartupModule } from "../Module";
import type { planning_type } from "../Planning";

export const declarative_tenant_module: StartupModule<planning_type<declarative_versioned_tenant>> =
    {
        name: "declarative-tenant.module",
        description: `Plans how to change the tenants in the database`,
        is_target: true,
        optional: false,
        timeout_ms: 0,
        before: [],
        requires: ["declarative-version.module", "database.target"],
        after: ["declarative-version.module", "database.target"],
        async enabled(): Promise<boolean> {
            return true;
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
                    name: latest_version_value[0].name,
                    preferred_compression_method:
                        latest_version_value[0].preferred_compression_method,
                    priority: latest_version_value[0].priority,
                    ttl: latest_version_value[0].ttl,
                    signing_method: latest_version_value[0].signing_method,
                };

                if (
                    JSON.stringify(latest_version_as_config_value) !== JSON.stringify(config_value)
                ) {
                    return_object.modified.push(latest_version_value[0]);
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
