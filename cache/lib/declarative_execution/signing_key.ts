import type {
    api_key,
    declarative_versioned_api_key,
    declarative_versioned_public_key,
    signing_key,
} from "@iglu-sh/shared";
import { Signing_Keys } from "@iglu-sh/shared/db";
import type { PgExecutor, SQLiteExecutor } from "@iglu-sh/shared/db/DAO/DAO";
import { Logger } from "@iglu-sh/shared/logger";
import type { config } from "@iglu-sh/shared/utils/cache";
import type { planning_type } from "../startup_modules/Planning";

export async function signing_key_execution(
    tx: SQLiteExecutor | PgExecutor,
    planned_signing_keys: planning_type<declarative_versioned_public_key>,
    config: config,
    api_keys_for_db_version: Array<{ declarative: declarative_versioned_api_key; db: api_key }>,
): Promise<Array<{ declarative: declarative_versioned_public_key; db: signing_key }>> {
    const signing_key_dao = new Signing_Keys(tx);
    const signing_keys_for_db_version: Array<{
        db: signing_key;
        declarative: declarative_versioned_public_key;
    }> = [];

    const all_public_keys_in_db = await signing_key_dao.getAll();

    // First up, deletion of old Signing Keys
    if (config.config.reconcile.mode === "authorative") {
        for (const deleted_signing_key of planned_signing_keys.deleted) {
            const signing_key_in_db = all_public_keys_in_db.filter(
                (x) => x.id === deleted_signing_key.id,
            );

            if (!signing_key_in_db[0]) {
                Logger.warn(
                    `Bug: The Signing key with id ${deleted_signing_key.id} does not exist in the database but was supposed to be deleted by the declarative execution script.`,
                );
                continue;
            }
            if (signing_key_in_db[0].managed_by !== "configuration") {
                Logger.warn(
                    `Bug: Signing Key with id ${deleted_signing_key.id} was marked as 'to_delete' by the declarative planning algorithm but the associated record is NOT managed by the configuration (changed by User?). NOT touching it as I'm not sure what to do with it)`,
                );
                continue;
            }

            await signing_key_dao.delete(signing_key_in_db[0]);
        }
    }

    // Next, we create all new signing keys
    for (const new_signing_key of planned_signing_keys.new) {
        const linked_api_key = api_keys_for_db_version.filter(
            (x) => x.declarative.mapped_from === new_signing_key.linked_api_key,
        );
        if (!linked_api_key[0]) {
            Logger.error(
                `BUG: The Signing Key ${new_signing_key.name} is supposed to link to api key: ${new_signing_key.linked_api_key}, however that API Key does not exist in the database after it should've been created!`,
            );
            throw new Error(
                `BUG: The Signing Key ${new_signing_key.name} is supposed to link to api key: ${new_signing_key.linked_api_key}, however that API Key does not exist in the database after it should've been created!`,
            );
        }
        const db_returned_signing_key = await signing_key_dao.insert({
            id: "n/a",
            name: new_signing_key.name,
            key: new_signing_key.key,
            managed_by: "configuration",
            api_keys_id: linked_api_key[0].db,
        });

        signing_keys_for_db_version.push({
            db: db_returned_signing_key,
            declarative: {
                ...new_signing_key,
                ...db_returned_signing_key,
                id: db_returned_signing_key.id,
            },
        });
    }

    // Overwrite all the currently configured signing keys with the values in the modified or unchanged arrays
    for (const existing_signing_key of planned_signing_keys.unchanged.concat(
        planned_signing_keys.modified,
    )) {
        const signing_key_really_exists = await signing_key_dao.getById(existing_signing_key.id);

        if (signing_key_really_exists === null) {
            Logger.error(
                `BUG: The signing key declaration script determined that the API Key with the id "${existing_signing_key.id}" was supposed to be in this current version (and the last) but it does not exist in the database anymore`,
            );
            continue;
        }

        const id_of_signing_key = api_keys_for_db_version.filter(
            (x) => x.declarative.mapped_from === existing_signing_key.linked_api_key,
        );

        if (!id_of_signing_key[0]) {
            Logger.error(
                `BUG: The signing key ${existing_signing_key.name} references a non-existant API-Key ${existing_signing_key.linked_api_key}`,
            );
            throw new Error(
                `BUG: The signing key ${existing_signing_key.name} references a non-existant API-Key ${existing_signing_key.linked_api_key}`,
            );
        }

        const db_returned_signing_key = await signing_key_dao.update({
            id: existing_signing_key.id,
            name: existing_signing_key.name,
            managed_by: "configuration",
            key: existing_signing_key.key,
            api_keys_id: id_of_signing_key[0].db,
        });

        signing_keys_for_db_version.push({
            db: db_returned_signing_key,
            declarative: {
                ...db_returned_signing_key,
                ...existing_signing_key,
            },
        });
    }

    return signing_keys_for_db_version;
}
