import type {SQLiteExecutor, PgExecutor} from "@iglu-sh/shared/db/DAO/DAO"
import type { planning_type } from "../startup_modules/Planning";
import type { declarative_versioned_tenant, tenant, keypair, declarative_versioned_keypair } from "@iglu-sh/shared";
import type { config } from "@iglu-sh/shared/utils/cache";
import { create_keypair } from "@iglu-sh/shared/db/utils/create_keypair";
import { Logger } from "@iglu-sh/shared/logger";
import { Keypairs } from "@iglu-sh/shared/db/DAO/keypairs";
import { Api_keys } from "@iglu-sh/shared/db";

export async function keypair_execution(
    tx: SQLiteExecutor | PgExecutor, 
    planned_keypairs: planning_type<declarative_versioned_keypair>, 
    config:config, 
    tenants_for_db_version:Array<{declarative:declarative_versioned_tenant, db:tenant}>
):Promise<Array<{declarative:declarative_versioned_keypair; db:keypair}>>{

    const keypair_dao = new Keypairs(tx);
    const api_key_dao = new Api_keys(tx);
    const all_keypairs = await keypair_dao.getAll();
    const keypairs_for_db_version: Array<{
        db: keypair;
        declarative: declarative_versioned_keypair;
    }> = [];

    // Delete all the ones we currently have configured and that should be deleted
    if (config.config.reconcile.mode === "authorative") {
        for (const deleted_keypair of planned_keypairs.deleted) {
            const keypair_in_db = all_keypairs.filter((x) => x.id === deleted_keypair.id);
            if (!keypair_in_db[0]) {
                Logger.warn(
                    `Bug: The Keypair with id ${deleted_keypair.id} does not exist in the database but was determined to be deleted by the keypair planning script. Please report this to Iglu`,
                );
                continue;
            }

            await keypair_dao.delete(keypair_in_db[0]);

            const linked_api_key = await api_key_dao.getById(
                deleted_keypair.signing_keys_id.api_keys_id.id,
            );

            // Delete the linked API Key (this also causes the Signing Key to be deleted due to foreign key dependency)
            if (linked_api_key !== null) {
                await api_key_dao.delete(linked_api_key);
            }
        }
    }

    // Next, we create all new keypairs
    for (const new_keypair of planned_keypairs.new) {
        const linked_tenant = tenants_for_db_version.filter(
            (x) => x.declarative.mapped_from === new_keypair.tenant,
        );

        if (!linked_tenant[0]) {
            Logger.error(
                `BUG: The Keypair ${new_keypair.mapped_from} is supposed to link to tenant: ${new_keypair.tenant}, however that Tenant does not exist in the database after it should've been created!`,
            );
            throw new Error(
                `BUG: The Keypair ${new_keypair.mapped_from} is supposed to link to tenant: ${new_keypair.tenant}, however that Tenant does not exist in the database after it should've been created!`,
            );
        }

        const keypair = await create_keypair(linked_tenant[0].db.id, "configuration", tx);

        keypairs_for_db_version.push({
            db: keypair,
            declarative: {
                ...new_keypair,
                ...keypair,
                id: keypair.id,
            },
        });
    }

    // Overwrite all the currently configured keypairs with the values in the modified or unchanged arrays
    for (const existing_keypair of planned_keypairs.unchanged.concat(planned_keypairs.modified)) {
        const keypair_really_exists = await keypair_dao.getById(existing_keypair.id);
        if (keypair_really_exists === null) {
            Logger.error(
                `BUG: The keypair declaration script determined that the Keypair with the id "${existing_keypair.id}" was supposed to be in this current version (and the last) but it does not exist in the database anymore`,
            );
            throw new Error(
                `BUG: The keypair declaration script determined that the Keypair with the id "${existing_keypair.id}" was supposed to be in this current version (and the last) but it does not exist in the database anymore`,
            );
        }
        if (keypair_really_exists.managed_by !== "configuration") {
            Logger.error(
                `BUG: The keypair declaration script determined that the Keypair with the id "${existing_keypair.id} should be updated, but it is not managed by the configuration, not touching it."`,
            );
            throw new Error(
                `BUG: The keypair declaration script determined that the Keypair with the id "${existing_keypair.id} should be updated, but it is not managed by the configuration, not touching it."`,
            );
        }
        const tenant_to_link_to = tenants_for_db_version.filter(
            (x) => x.declarative.mapped_from === existing_keypair.tenant,
        );

        if (!tenant_to_link_to[0]) {
            Logger.error(
                `Error: The Keypair ${existing_keypair.id} tried to link to the unknown tenant: ${existing_keypair.tenant}`,
            );
            throw new Error(
                `Error: The Keypair ${existing_keypair.id} tried to link to the unknown tenant: ${existing_keypair.tenant}`,
            );
        }

        const db_returned_keypair = await keypair_dao.update({
            id: existing_keypair.id,
            tenants_id: tenant_to_link_to[0].db,
            managed_by: "configuration",
            private_key: existing_keypair.private_key,
            signing_keys_id: existing_keypair.signing_keys_id,
        });

        keypairs_for_db_version.push({
            db: db_returned_keypair,
            declarative: {
                ...db_returned_keypair,
                ...existing_keypair,
            },
        });
    }
    return keypairs_for_db_version;
}
