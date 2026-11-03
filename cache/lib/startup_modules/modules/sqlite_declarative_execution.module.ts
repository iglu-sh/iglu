import type {
    declarative_versioned_api_key,
    declarative_versioned_deployment_key,
    declarative_versioned_keypair,
    declarative_versioned_public_key,
    declarative_versioned_tenant,
    tenant,
} from "@iglu-sh/shared";
import SQLiteConnector from "@iglu-sh/shared/db/Connectors/SQLite";
import { tenants as sqlite_tenant } from "@iglu-sh/shared/db/schema_sqlite";
import type { config } from "@iglu-sh/shared/utils/cache";
import { and, eq } from "drizzle-orm";
import { Logger } from "@/shared/logger";
import { parseDuration } from "@/shared/utils";
import type { StartupModule } from "../Module";
import type { planning_type } from "../Planning";
import { Tenants } from "@/shared/db";

export const sqlite_declarative_execution_module: StartupModule<void> = {
    name: "sqlite-declarative-execution.module",
    description: "Executes the declarative planning results",
    is_target: false,

    before: [],
    after: [
        "database.target",
        "declarative.target",
        "configuration.module",
        "sqlite_migrations.module",
    ],
    requires: [
        "database.target",
        "declarative.target",
        "configuration.module",
        "sqlite_migrations.module",
    ],

    timeout_ms: 100,
    optional: false,

    enabled: async (ctx): Promise<boolean> => {
        const config = ctx.get("configuration.module") as config;

        // Only enable this module if reconcile is even enabled
        if (config.config.reconcile.mode === "off") {
            return false;
        }

        return config.database.database_type === "sqlite";
    },

    start: async (ctx): Promise<void> => {
        const config = ctx.get("configuration.module") as config;
        const planned_tenants = ctx.get(
            "declarative-tenant.module",
        ) as planning_type<declarative_versioned_tenant>;
        const planned_api_keys = ctx.get(
            "declarative-api-keys.module",
        ) as planning_type<declarative_versioned_api_key>;
        const planned_deployment_keys = ctx.get(
            "declarative-deployment-key.module",
        ) as planning_type<declarative_versioned_deployment_key>;
        const planned_keypairs = ctx.get(
            "declarative-keypair.module",
        ) as planning_type<declarative_versioned_keypair>;
        const plannend_signing_keys = ctx.get(
            "declarative-signing-keys.module",
        ) as planning_type<declarative_versioned_public_key>;

        const db = new SQLiteConnector().getDB();

        db.transaction(async (tx) => {
            const tenant_dao = new Tenants(tx);

            const all_tenants_in_db = await tenant_dao.getAll()
            const tenants_for_db_version:Array<{declarative:declarative_versioned_tenant, db: tenant}> = [] 

            // First, we delete all the tenants that are in the "deleted" array, but only if the config tells us that we aren't "additive"
            // If we are additive then we just skip this part
            if(config.config.reconcile.mode !== "additive"){
                for(const deleted_tenant of planned_tenants.deleted){
                    const tenant_in_db = all_tenants_in_db.filter((x)=>x.id === deleted_tenant.id)
                    if(!tenant_in_db[0]){
                        Logger.warn(`Bug: The tenant with id ${deleted_tenant.id} does not exist in the database but was supposed to be deleted by the config reconcile script. Skipping...`)
                        continue;
                    }
                    await tenant_dao.delete(tenant_in_db[0])
                }
            }

            // Next, we create all new tenants 
            for(const new_tenant of planned_tenants.new){
                const tenant_already_exists = await tenant_dao.getByName(new_tenant.name)
                if(tenant_already_exists.length > 0){
                    Logger.warn(`WARNING: Tried creating a tenant with the name "${new_tenant.name}" but it already exists in the database (It is: ${(tenant_already_exists[0] as tenant).managed_by == "configuration" ? "Managed by Configuration (this is a BUG! Please report it)" : "Not managed by a configuration, delete it through the REST API."})`)
                    continue;
                }

                const db_returned_tenant = await tenant_dao.insert({
                    id: "n/a",
                    github_username: new_tenant.github_username,
                    is_public: new_tenant.is_public,
                    name: new_tenant.name,
                    permission: new_tenant.permission,
                    preferred_compression_method: new_tenant.preferred_compression_method,
                    uri: new_tenant.uri,
                    priority: new_tenant.priority,
                    ttl: parseDuration(new_tenant.ttl),
                    signing_method: new_tenant.signing_method,
                    managed_by: new_tenant.managed_by
                })
                
                tenants_for_db_version.push({
                    db: db_returned_tenant,
                    declarative: {
                        ...new_tenant,
                        id: db_returned_tenant.id
                    },
                })
            }

            // Overwrite all the currently configured tenants with the values in the modified or unchanged arrays
            for(const existing_tenant of planned_tenants.modified.concat(planned_tenants.unchanged)){
                const tenant_really_exists = await tenant_dao.getByName(existing_tenant.id);
                if(tenant_really_exists.length === 0){
                    Logger.error(`BUG: The Tenant declaration script determined that the tenant with id "${existing_tenant.id}" (Managed By: ${existing_tenant.managed_by}) already exists and is either modified or unmodified but it cannot be found in the database. Either it got deleted by you or something else, please report this to Iglu on Github.`);
                    continue;
                }

                // Overwrite the tenant settings
                const db_returned_tenant = await tenant_dao.update({
                    id: existing_tenant.id,
                    github_username: existing_tenant.github_username,
                    is_public: existing_tenant.is_public,
                    name: existing_tenant.name,
                    permission: existing_tenant.permission,
                    preferred_compression_method: existing_tenant.preferred_compression_method,
                    uri: existing_tenant.uri,
                    priority: existing_tenant.priority,
                    ttl: parseDuration(existing_tenant.ttl),
                    signing_method: existing_tenant.signing_method,
                    managed_by: existing_tenant.managed_by
                })

                tenants_for_db_version.push({
                    db: db_returned_tenant,
                    declarative: existing_tenant 
                })
            }
        });
    },

    stop: async (): Promise<void> => {},
};
