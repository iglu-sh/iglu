import type { database_version, declarative_versioned_api_key, declarative_versioned_deployment_key, declarative_versioned_keypair, declarative_versioned_public_key, declarative_versioned_tenant } from "@iglu-sh/shared";
import { Database_Versions } from "@iglu-sh/shared/db/DAO/database_versions";
import type { config } from "@iglu-sh/shared/utils/cache";
import type { StartupModule } from "../Module";
import type { planning_type } from "../Planning";

export const sqlite_declarative_execution_module: StartupModule<void> = {
    name: "sqlite-declarative-execution.module",
    description: "Executes the declarative planning results",
    is_target: false,

    before: [],
    after: ["database.target", "declarative.target", "configuration.module"],
    requires: ["database.target", "declarative.target", "configuration.module"],

    timeout_ms: 100,
    optional: false,

    enabled: async (ctx): Promise<boolean> => {
        const config = ctx.get("configuration.module") as config;

        // Only enable this module if reconcile is even enabled
        if(config.config.reconcile.mode === "off"){
            return false;
        }

        return config.database.database_type === "sqlite";
    },

    start: async (ctx): Promise<void> => {
        const planned_tenants = ctx.get("declarative-tenant.module") as planning_type<declarative_versioned_tenant>;
        const planned_api_keys = ctx.get("declarative-api-keys.module") as planning_type<declarative_versioned_api_key>;
        const planned_deployment_keys = ctx.get("declarative-deployment-key.module") as planning_type<declarative_versioned_deployment_key>;
        const planned_keypairs = ctx.get("declarative-keypair.module") as planning_type<declarative_versioned_keypair>;
        const plannend_signing_keys = ctx.get("declarative-signing-keys.module") as planning_type<declarative_versioned_public_key>;

        console.log(planned_tenants, planned_api_keys, planned_deployment_keys, planned_keypairs, plannend_signing_keys)
    },

    stop: async (): Promise<void> => {},
};
