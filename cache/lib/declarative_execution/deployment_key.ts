import type {
    declarative_versioned_deployment_key,
    declarative_versioned_tenant,
    deployment_key,
    tenant,
} from "@iglu-sh/shared";
import { Deployment_keys } from "@iglu-sh/shared/db";
import type { PgExecutor, SQLiteExecutor } from "@iglu-sh/shared/db/DAO/DAO";
import { Logger } from "@iglu-sh/shared/logger";
import type { config } from "@iglu-sh/shared/utils/cache";
import type { planning_type } from "../startup_modules/Planning";

/**
 * @description Executes the planned declarative actions in regards to the
 * */
export async function deployment_key_execution(
    tx: SQLiteExecutor | PgExecutor,
    planned_deployment_keys: planning_type<declarative_versioned_deployment_key>,
    config: config,
    tenants_for_db_version: Array<{ declarative: declarative_versioned_tenant; db: tenant }>,
): Promise<Array<{ declarative: declarative_versioned_deployment_key; db: deployment_key }>> {
    const deployment_key_dao = new Deployment_keys(tx);
    const all_deployment_keys = await deployment_key_dao.getAll();

    const deployment_keys_for_db_version: Array<{
        db: deployment_key;
        declarative: declarative_versioned_deployment_key;
    }> = [];

    // Delete the keys that should be deleted
    if (config.config.reconcile.mode === "authorative") {
        for (const deleted_key of planned_deployment_keys.deleted) {
            const keypair_in_db = all_deployment_keys.filter((x) => x.id === deleted_key.id);
            if (!keypair_in_db[0]) {
                Logger.warn(
                    `Bug: The Keypair with id ${deleted_key.id} does not exist in the database but was determined to be deleted. Continuing...`,
                );
                continue;
            }

            if (keypair_in_db[0].managed_by !== "configuration") {
                Logger.error(
                    `Bug: The Keypair with id ${deleted_key.id} (config_key: ${deleted_key.mapped_from}) is no longer a configuration-managed object though it was in the last database version. Not touching this key and aborting transaction.`,
                );
                throw new Error(
                    `Bug: The Keypair with id ${deleted_key.id} (config_key: ${deleted_key.mapped_from}) is no longer a configuration-managed object though it was in the last database version. Not touching this key and aborting transaction.`,
                );
            }

            await deployment_key_dao.delete(keypair_in_db[0]);
        }
    }

    // Create new keypairs
    for (const new_key of planned_deployment_keys.new) {
        const linked_tenant = tenants_for_db_version.filter(
            (x) => x.declarative.mapped_from === new_key.tenant,
        );

        if (!linked_tenant[0]) {
            Logger.error(
                `Bug: The Deployment Key ${new_key.mapped_from} references the unknown tenant ${new_key.tenant}. This should've been caught by the declarative planning phase, please report this to iglu`,
            );
            throw new Error(
                `Bug: The Deployment Key ${new_key.mapped_from} references the unknown tenant ${new_key.tenant}. This should've been caught by the declarative planning phase, please report this to iglu`,
            );
        }

        const deployment_key = await deployment_key_dao.insert({
            id: "n/a",
            name: new_key.mapped_from,
            managed_by: "configuration",
            hash: new_key.hash,
            tenants_id: linked_tenant[0].db,
            type: new_key.type,
            expires_at: new_key.expires_at,
            created_at: Date.now(),
        });

        deployment_keys_for_db_version.push({
            db: deployment_key,
            declarative: {
                ...deployment_key,
                ...new_key,
                id: deployment_key.id,
            },
        });
    }

    // Overwrite all the currently configured deployment keys with the values in the modfified or unchanged arrays just so we can be sure that the database actually looks like our database version
    for (const existing_deployment_key of planned_deployment_keys.unchanged.concat(
        planned_deployment_keys.modified,
    )) {
        const key_really_exists = await deployment_key_dao.getById(existing_deployment_key.id);

        if (key_really_exists === null) {
            Logger.error(
                `BUG: They deployment declaration script determined that the Deployment key with the id ${existing_deployment_key.id} (config key: ${existing_deployment_key.mapped_from}) was supposed to be in this current version (and the one before that) but it does not exist in the database.`,
            );
            throw new Error(
                `BUG: They deployment declaration script determined that the Deployment key with the id ${existing_deployment_key.id} (config key: ${existing_deployment_key.mapped_from}) was supposed to be in this current version (and the one before that) but it does not exist in the database.`,
            );
        }

        if (key_really_exists.managed_by !== "configuration") {
            Logger.error(
                `BUG: The deployment_key declaration script determined that the deployment_key with the id "${existing_deployment_key.id} (config key: ${existing_deployment_key.mapped_from}) should be updated, but it is not managed by the configuration, not touching it."`,
            );
            throw new Error(
                `BUG: The deployment_key declaration script determined that the deployment_key with the id "${existing_deployment_key.id} (config key: ${existing_deployment_key.mapped_from}) should be updated, but it is not managed by the configuration, not touching it."`,
            );
        }

        const tenant_to_link_to = tenants_for_db_version.filter(
            (x) => x.declarative.mapped_from === existing_deployment_key.tenant,
        );

        if (!tenant_to_link_to[0]) {
            Logger.error(
                `BUG: The deployment key with id ${existing_deployment_key.id} (config key: ${existing_deployment_key.mapped_from}) references the unknown tenant ${existing_deployment_key.tenant}`,
            );
            throw new Error(
                `BUG: The deployment key with id ${existing_deployment_key.id} (config key: ${existing_deployment_key.mapped_from}) references the unknown tenant ${existing_deployment_key.tenant}`,
            );
        }

        const db_returned_key = await deployment_key_dao.update({
            id: existing_deployment_key.id,
            name: existing_deployment_key.mapped_from,
            managed_by: "configuration",
            hash: existing_deployment_key.hash,
            tenants_id: tenant_to_link_to[0].db,
            type: existing_deployment_key.type,
            expires_at: existing_deployment_key.expires_at,
            created_at: Date.now(),
        });

        deployment_keys_for_db_version.push({
            db: db_returned_key,
            declarative: {
                ...db_returned_key,
                ...existing_deployment_key,
            },
        });
    }

    return deployment_keys_for_db_version;
}
