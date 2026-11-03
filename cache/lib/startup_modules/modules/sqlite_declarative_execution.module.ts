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

        console.log(
            planned_tenants,
            planned_api_keys,
            planned_deployment_keys,
            planned_keypairs,
            plannend_signing_keys,
        );

        const db = new SQLiteConnector().getDB();

        db.transaction(async (tx) => {
            // First we fetch all tenants that are currently in the database
            const tenant_db_state = tx.select().from(sqlite_tenant).all();
            const tenant_db_names = tenant_db_state.map((x) => x.name);
            const tenants_for_db_version: {
                [key: string]: { declarative: declarative_versioned_tenant; db_state: tenant };
            } = {};

            // First we delete all the tenants that shouldn't exist anymore
            for (const deleted_tenant of planned_tenants.deleted) {
                Logger.debug(
                    `Deleted tenant ${deleted_tenant.name} (managed by configuration and is no longer configured)`,
                );
                await tx
                    .delete(sqlite_tenant)
                    .where(
                        and(
                            eq(sqlite_tenant.id, deleted_tenant.id),
                            eq(sqlite_tenant.managed_by, "configuration"),
                        ),
                    );
            }

            // Now we create all the new ones
            for (const new_tenant of planned_tenants.new) {
                if (tenant_db_names.includes(new_tenant.name)) {
                    Logger.warn(
                        `The configured tenant ${new_tenant.name} already exists in the database but it is NOT managed by the configuration. Not touching it, delete it if you want your configuration to manage it.`,
                    );
                    continue;
                }
                console.log(new_tenant);

                const created = await tx
                    .insert(sqlite_tenant)
                    .values({
                        github_username: new_tenant.github_username,
                        is_public: new_tenant.is_public,
                        name: new_tenant.name,
                        permission: new_tenant.permission,
                        preferred_compression_method: new_tenant.preferred_compression_method,
                        uri: new_tenant.uri,
                        priority: new_tenant.priority,
                        ttl: parseDuration(new_tenant.ttl),
                        signing_method: new_tenant.signing_method,
                        managed_by: "configuration",
                    })
                    .returning();
                if (!created[0]) {
                    Logger.error(
                        `Didn't get anything back from tenant creation! (while declaring tenant ${new_tenant.mapped_from})`,
                    );
                    throw new Error(
                        `Didn't get anything back from tenant creation! (while declaring tenant ${new_tenant.mapped_from})`,
                    );
                }
                tenants_for_db_version[new_tenant.mapped_from] = {
                    db_state: created[0],
                    declarative: {
                        ...new_tenant,
                        id: created[0].id,
                    },
                };
                Logger.debug(
                    `Created NEW tenant with ID ${created[0].id}, mapped from "${new_tenant.mapped_from}"`,
                );
            }

            // Now we loop over every tenant in the modified and umodified arrays and set them both to the values they have configured
            for (const tenant_obj of planned_tenants.modified.concat(planned_tenants.unchanged)) {
                console.log(tenant_obj);

                const updated_state = await tx
                    .update(sqlite_tenant)
                    .set({
                        github_username: tenant_obj.github_username,
                        is_public: tenant_obj.is_public,
                        name: tenant_obj.name,
                        permission: tenant_obj.permission,
                        preferred_compression_method: tenant_obj.preferred_compression_method,
                        uri: tenant_obj.uri,
                        priority: tenant_obj.priority,
                        ttl: parseDuration(tenant_obj.ttl),
                        signing_method: tenant_obj.signing_method,
                        managed_by: "configuration",
                    })
                    .where(
                        and(
                            eq(sqlite_tenant.id, tenant_obj.id),
                            eq(sqlite_tenant.managed_by, "configuration"),
                        ),
                    )
                    .returning();
                if (!updated_state[0]) {
                    Logger.error(
                        `Didn't get anything back from a returning update statement in declaring tenants! (while declaring tenant ${tenant_obj.mapped_from})`,
                    );
                    throw new Error(
                        `Didn't get anything back from a returning update statement in declaring tenants! (while declaring tenant ${tenant_obj.mapped_from})`,
                    );
                }

                Logger.debug(
                    `Updated tenant with id ${updated_state[0].id}, mapped from "${tenant_obj.mapped_from}"`,
                );

                tenants_for_db_version[tenant_obj.mapped_from] = {
                    db_state: updated_state[0],
                    declarative: tenant_obj,
                };
            }

            tx.rollback();
        });
    },

    stop: async (): Promise<void> => {},
};
