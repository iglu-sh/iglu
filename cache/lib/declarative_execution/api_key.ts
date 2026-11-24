import type {
    api_key,
    declarative_versioned_api_key,
    declarative_versioned_tenant,
    tenant,
} from "@iglu-sh/shared";
import { Api_keys, Api_keys_tenants_link } from "@iglu-sh/shared/db";
import type { PgExecutor, SQLiteExecutor } from "@iglu-sh/shared/db/DAO/DAO";
import { Logger } from "@iglu-sh/shared/logger";
import type { config } from "@iglu-sh/shared/utils/cache";
import type { planning_type } from "../startup_modules/Planning";

export async function api_key_execution(
    tx: SQLiteExecutor | PgExecutor,
    planned_api_keys: planning_type<declarative_versioned_api_key>,
    config: config,
    tenants_for_db_version: Array<{ declarative: declarative_versioned_tenant; db: tenant }>,
): Promise<Array<{ declarative: declarative_versioned_api_key; db: api_key }>> {
    const api_key_dao = new Api_keys(tx);
    const api_key_tenant_link_dao = new Api_keys_tenants_link(tx);

    const api_keys_for_db_version: Array<{
        db: api_key;
        declarative: declarative_versioned_api_key;
    }> = [];

    // Now that we're finished with all of this, we can go over to the API Key section
    // We execute everything in the same order as we did for the tenants, except for the fact that we obviously need to fetch the tenants

    const all_api_keys_in_db = await api_key_dao.getAll();

    // First up, deletion of old API Keys
    if (config.config.reconcile.mode === "authorative") {
        for (const deleted_api_key of planned_api_keys.deleted) {
            const api_key_in_db = all_api_keys_in_db.filter((x) => x.id === deleted_api_key.id);
            if (!api_key_in_db[0]) {
                Logger.warn(
                    `Bug: The api key with id ${deleted_api_key.id} does not exist in the database but was supposed to be deleted by the declarative execution script.`,
                );
                continue;
            }
            if (api_key_in_db[0].managed_by !== "configuration") {
                Logger.warn(
                    `Bug: Api Key with id ${deleted_api_key.id} was marked as 'to_delete' by the declarative planning algorithm but the associated record is NOT managed by the configuration (changed by User?). NOT touching it as I'm not sure what to do with it)`,
                );
                continue;
            }

            await api_key_dao.delete(api_key_in_db[0]);
        }
    }

    // Next, we create all new api keys
    for (const new_api_key of planned_api_keys.new) {
        const db_returned_api_key = await api_key_dao.insert({
            id: "n/a",
            name: new_api_key.name,
            hash: new_api_key.hash,
            managed_by: "configuration",
        });

        // Get the Associated Tenant ID that this API Key should be linked to
        const associated_tenant = tenants_for_db_version.filter(
            (x) => x.declarative.mapped_from === new_api_key.tenant,
        );
        if (!associated_tenant[0]) {
            throw new Error(`Unable to find tenant for Api Key: ${new_api_key.mapped_from}`);
        }

        await api_key_tenant_link_dao.insert({
            id: "n/a",
            tenants_id: associated_tenant[0].db,
            api_keys_id: db_returned_api_key,
        });

        api_keys_for_db_version.push({
            db: db_returned_api_key,
            declarative: {
                ...new_api_key,
                ...db_returned_api_key,
                id: db_returned_api_key.id,
            },
        });
    }

    // Overwrite all the currently configured api_keys with the values in the modified or unchanged arrays
    for (const existing_api_key of planned_api_keys.unchanged.concat(planned_api_keys.modified)) {
        const api_key_really_exists = await api_key_dao.getById(existing_api_key.id);

        if (api_key_really_exists === null) {
            Logger.error(
                `BUG: The api key declaration script determined that the API Key with the id "${existing_api_key.id}" was supposed to be in this current version (and the last) but it does not exist in the database anymore`,
            );
            continue;
        }

        const db_returned_api_key = await api_key_dao.update({
            id: existing_api_key.id,
            name: existing_api_key.name,
            managed_by: "configuration",
            hash: existing_api_key.hash,
        });

        // Check if the tenant provided is still the same as in the configuration state
        const tenant_in_api_key_definition = tenants_for_db_version.filter(
            (x) => x.declarative.mapped_from === existing_api_key.tenant,
        );

        if (!tenant_in_api_key_definition[0]) {
            Logger.error(
                `BUG: The API Key ${existing_api_key.mapped_from} references the non-existant Tenant ${existing_api_key.tenant}. This is a Bug, as this should've been caught in the planing process.`,
            );
            continue;
        }

        const current_key_links = await api_key_tenant_link_dao.getByApiKey(existing_api_key.id);

        // Add a link record for the API Key <-> Tenant
        // This is just an additive process, deleting links may come later as if we were to delete at the moment, every stored tenant <-> derivation link will become unusable
        if (
            current_key_links.filter(
                (x) =>
                    x.tenants_id.id ===
                    (
                        tenant_in_api_key_definition[0] as {
                            db: tenant;
                            declarative: declarative_versioned_tenant;
                        }
                    ).db.id,
            ).length === 0
        ) {
            await api_key_tenant_link_dao.insert({
                id: "n/a",
                api_keys_id: db_returned_api_key,
                tenants_id: tenant_in_api_key_definition[0].db,
            });
        }

        api_keys_for_db_version.push({
            db: db_returned_api_key,
            declarative: {
                ...db_returned_api_key,
                ...existing_api_key,
            },
        });
    }

    return api_keys_for_db_version;
}
