import { eq } from "drizzle-orm";
import type { signing_key } from "@/db_types";
import Logger from "@/logger";
import SQLiteConnector from "../../Connectors/SQLite";
import { api_keys, api_keys_tenants_link, signing_keys } from "../../schema_sqlite";
export default class sqlite_signing_keys {
    private db = new SQLiteConnector().getDB();

    /**
     * @description Insert a new Signing Key into the Database
     * @param {signing_key} item
     * @returns {Promise<signing_key>}
     * */
    public async insert(item: signing_key): Promise<signing_key> {
        const key: typeof signing_keys.$inferInsert = {
            ...item,
            id: undefined,
            api_keys_id: item.api_keys_id.id,
        };

        const return_values = await this.db.transaction(async (tx) => {
            const return_value = await tx.insert(signing_keys).values(key).returning();
            if (!return_value || return_value.length > 1 || !return_value[0]) {
                Logger.error(
                    "Panic(DB::DAO::signing_keys::sqlite_signing_keys): Could not insert into signing_keys table! (Unknown Error)",
                );
                throw new Error(
                    "Panic(DB::DAO::signing_keys::sqlite_signing_keys): Could not insert into signing_keys table?",
                );
            }

            return await tx
                .select({
                    id: signing_keys.id,
                    key: signing_keys.key,
                    api_keys_id: api_keys,
                    name: signing_keys.name,
                })
                .from(signing_keys)
                .innerJoin(api_keys, eq(signing_keys.api_keys_id, api_keys.id))
                .where(eq(signing_keys.id, return_value[0].id));
        });

        if (!return_values?.[0] || return_values.length !== 1) {
            Logger.error(
                "Panic(DB::DAO::signing_keys::sqlite_signing_keys): Could not insert into signing_keys table! (Did not receive a record from transaction)",
            );
            throw new Error(
                "Panic(DB::DAO::signing_keys::sqlite_signing_keys): Could not insert into signing_keys table! (Did not receive a record from transaction)",
            );
        }

        return return_values[0];
    }

    /**
     * @description Gets all records out of the signing_keys table
     * @returns {Promise<Array<signing_key>>}
     * */
    public async getAll(): Promise<Array<signing_key>> {
        return await this.db
            .select({
                id: signing_keys.id,
                key: signing_keys.key,
                api_keys_id: api_keys,
                name: signing_keys.name,
            })
            .from(signing_keys)
            .innerJoin(api_keys, eq(signing_keys.api_keys_id, api_keys.id));
    }

    /**
     * @description Filter the signing keys table by api key
     * @param {string} key_id - The Key ID
     * @returns {Promise<signing_key|null>}
     * */
    public async getByApiKeyId(key_id: string): Promise<signing_key | null> {
        return await this.db
            .select({
                id: signing_keys.id,
                key: signing_keys.key,
                api_keys_id: api_keys,
                name: signing_keys.name,
            })
            .from(signing_keys)
            .innerJoin(api_keys, eq(signing_keys.api_keys_id, api_keys.id))
            .where(eq(api_keys.id, key_id))
            .then((return_items) => {
                if (!return_items[0] || return_items.length !== 1) {
                    return null;
                }
                return return_items[0];
            });
    }

    /**
     * @description Finds all Signing Keys associated with a given Tenant ID
     * @param {string} tenant_id - The ID of the tenant
     * @returns {Promise<Array<signing_key>>}
     * */
    public async getByTenant(tenant_id: string): Promise<Array<signing_key>> {
        return await this.db
            .select({
                id: signing_keys.id,
                key: signing_keys.key,
                api_keys_id: api_keys,
                name: signing_keys.name,
            })
            .from(api_keys_tenants_link)
            .innerJoin(api_keys, eq(api_keys_tenants_link.api_keys_id, api_keys.id))
            .innerJoin(signing_keys, eq(api_keys.id, signing_keys.api_keys_id))
            .where(eq(api_keys_tenants_link.tenants_id, tenant_id));
    }

    /**
     * @description Attempts to find a record in the signing_keys table with the given ID
     * @param {string} id - The ID of the record you are trying to access
     * @returns {Promise<signing_key | null>} - (null if there's no record found)
     * @throws {Error} - If there's more than one record with the given ID
     * */
    public async getById(id: string): Promise<signing_key | null> {
        const db_data = await this.db
            .select({
                id: signing_keys.id,
                key: signing_keys.key,
                api_keys_id: api_keys,
                name: signing_keys.name,
            })
            .from(signing_keys)
            .innerJoin(api_keys, eq(signing_keys.api_keys_id, api_keys.id))
            .where(eq(signing_keys.id, id));
        if (db_data.length > 1) {
            Logger.error(
                "Panic(DB::DAO::signing_keys::sqlite_signing_keys): Got more than one returned in getByID, I do not know what to do with this",
            );
            throw new Error(
                "Panic(DB::DAO::signing_keys::sqlite_signing_keys): Got more than one returned in getByID, I do not know what to do with this",
            );
        }

        if (db_data.length === 0 || !db_data[0]) {
            return null;
        }
        return db_data[0];
    }

    /**
     * @description Deletes a signing_key. Only the ID field is respected in the given object
     * @param {signing_key} to_delete - The signing key object that contains the ID of the record to delete
     * @returns {Promise<void>}
     * */
    public async delete(to_delete: signing_key): Promise<void> {
        await this.db.delete(signing_keys).where(eq(signing_keys.id, to_delete.id));
    }

    /**
     * @description Updates a given record (comparing by ID) to a new state given in the to_update object
     * @param {signing_key} to_update - The object containing the ID and the desired state of the object
     * @returns {signing_key}
     * @throws {Error}
     * */
    public async update(to_update: signing_key): Promise<signing_key> {
        return await this.db.transaction(async (tx) => {
            const updated_item = await tx
                .update(signing_keys)
                .set({
                    key: to_update.key,
                    name: to_update.name,
                    api_keys_id: to_update.api_keys_id.id,
                })
                .where(eq(signing_keys.id, to_update.id))
                .returning();

            if (updated_item.length === 0 || !updated_item[0]) {
                Logger.error(
                    "Panic(DB::DAO::signing_keys::sqlite_signing_keys): Did not get an updated item back from the signing_keys table",
                );
                throw new Error(
                    "Panic(DB::DAO::signing_keys::sqlite_signing_keys): Did not get an updated item back from the signing_keys table",
                );
            }
            if (updated_item.length > 1) {
                Logger.error(
                    "Panic(DB::DAO::signing_keys::sqlite_signing_keys): Updated more than one record, although it was compared by ID",
                );
                throw new Error(
                    "Panic(DB::DAO::signing_keys::sqlite_signing_keys): Updated more than one record, although it was compared by ID",
                );
            }
            const new_state = await tx
                .select({
                    id: signing_keys.id,
                    key: signing_keys.key,
                    api_keys_id: api_keys,
                    name: signing_keys.name,
                })
                .from(signing_keys)
                .innerJoin(api_keys, eq(signing_keys.api_keys_id, api_keys.id));

            if (!new_state?.[0]) {
                Logger.error(
                    "Panic(DB::DAO::signing_keys::sqlite_signing_keys): Updated more than one record, although it was compared by ID",
                );
                throw new Error(
                    "Panic(DB::DAO::signing_keys::sqlite_signing_keys): Updated more than one record, although it was compared by ID",
                );
            }

            return new_state[0];
        });
    }
}
