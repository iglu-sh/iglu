import type {
    api_key,
    declarative_versioned_api_key,
    declarative_versioned_deployment_key,
    declarative_versioned_keypair,
    declarative_versioned_public_key,
    declarative_versioned_tenant,
    keypair,
    signing_key,
    tenant,
} from "@iglu-sh/shared";
import SQLiteConnector from "@iglu-sh/shared/db/Connectors/SQLite";
import type { config } from "@iglu-sh/shared/utils/cache";
import { Api_keys, Api_keys_tenants_link, Signing_Keys, Tenants } from "@/shared/db";
import type { PgExecutor, SQLiteExecutor } from "@/shared/db/DAO/DAO";
import { Keypairs } from "@/shared/db/DAO/keypairs";
import { create_keypair } from "@/shared/db/utils/create_keypair";
import { Logger } from "@/shared/logger";
import { parseDuration } from "@/shared/utils";
import type { StartupModule } from "../Module";
import type { planning_type } from "../Planning";

async function execute(
    tx: SQLiteExecutor | PgExecutor,
    planned_tenants: planning_type<declarative_versioned_tenant>,
    planned_api_keys: planning_type<declarative_versioned_api_key>,
    planned_signing_keys: planning_type<declarative_versioned_public_key>,
    planned_keypairs: planning_type<declarative_versioned_keypair>,
    planned_deployment_keys: planning_type<declarative_versioned_deployment_key>,
    config: config,
) {
    const tenant_dao = new Tenants(tx);

    const all_tenants_in_db = await tenant_dao.getAll();
    const tenants_for_db_version: Array<{ declarative: declarative_versioned_tenant; db: tenant }> =
        [];

    // First, we delete all the tenants that are in the "deleted" array, but only if the config tells us that we aren't "additive"
    // If we are additive then we just skip this part
    if (config.config.reconcile.mode !== "additive") {
        for (const deleted_tenant of planned_tenants.deleted) {
            const tenant_in_db = all_tenants_in_db.filter((x) => x.id === deleted_tenant.id);
            if (!tenant_in_db[0]) {
                Logger.warn(
                    `Bug: The tenant with id ${deleted_tenant.id} does not exist in the database but was supposed to be deleted by the config reconcile script. Skipping...`,
                );
                continue;
            }
            if (tenant_in_db[0].managed_by !== "configuration") {
                Logger.warn(
                    `Bug: Tenant with id ${deleted_tenant.id} was marked as 'to_delete' by the declarative planning algorithm, however this record is NOT managed by the Configuration (changed by User?). NOT deleting it cause I'm not sure what to do with it`,
                );
                continue;
            }
            await tenant_dao.delete(tenant_in_db[0]);
        }
    }

    // Next, we create all new tenants
    for (const new_tenant of planned_tenants.new) {
        const tenant_already_exists = await tenant_dao.getByName(new_tenant.name);
        if (tenant_already_exists.length > 0) {
            Logger.warn(
                `WARNING: Tried creating a tenant with the name "${new_tenant.name}" but it already exists in the database (It is: ${(tenant_already_exists[0] as tenant).managed_by === "configuration" ? "Managed by Configuration (this is a BUG! Please report it)" : "Not managed by a configuration, delete it through the REST API."})`,
            );
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
            managed_by: new_tenant.managed_by,
        });

        tenants_for_db_version.push({
            db: db_returned_tenant,
            declarative: {
                ...new_tenant,
                id: db_returned_tenant.id,
            },
        });
    }

    // Overwrite all the currently configured tenants with the values in the modified or unchanged arrays
    for (const existing_tenant of planned_tenants.modified.concat(planned_tenants.unchanged)) {
        const tenant_really_exists = await tenant_dao.getByName(existing_tenant.id);
        if (tenant_really_exists.length === 0) {
            Logger.error(
                `BUG: The Tenant declaration script determined that the tenant with id "${existing_tenant.id}" (Managed By: ${existing_tenant.managed_by}) already exists and is either modified or unmodified but it cannot be found in the database. Either it got deleted by you or something else, please report this to Iglu on Github.`,
            );
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
            managed_by: existing_tenant.managed_by,
        });

        tenants_for_db_version.push({
            db: db_returned_tenant,
            declarative: existing_tenant,
        });
    }

    /****************
     * API KEY LOGIC *
     *****************/
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

    /********************
     * Signing KEY LOGIC *
     *****************/
    const signing_key_dao = new Signing_Keys(tx);
    const signing_keys_for_db_version: Array<{
        db: signing_key;
        declarative: declarative_versioned_public_key;
    }> = [];

    const all_public_keys_in_db = await signing_key_dao.getAll();

    // First up, deletion of old Public Keys
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

    /********************
     * SERVER SIDE SIGNING LOGIC *
     *****************/
    const keypair_dao = new Keypairs(tx);
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
                ...keypair,
                ...new_keypair,
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
}

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
            await execute(
                tx,
                planned_tenants,
                planned_api_keys,
                plannend_signing_keys,
                planned_keypairs,
                planned_deployment_keys,
                config,
            );
        });
    },

    stop: async (): Promise<void> => {},
};
