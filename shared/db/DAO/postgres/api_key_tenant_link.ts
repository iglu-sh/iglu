import { and, eq } from "drizzle-orm";
import Logger from "../../../logger/Logger";
import type { api_key_tenant_link } from "../../../types/schema";
import PostgresConnector from "../../Connectors/Postgres";
import { api_keys, api_keys_tenants_link, tenants } from "../../schema_pg";
import type { api_keys_tenants_links_abstract } from "../abstracts/api_keys_tenants_links_abstract";

export default class postgres_api_key_tenant_link implements api_keys_tenants_links_abstract {
    private db = new PostgresConnector().getDB();

    /**
     * @description Insert into the api_key_tenant_link table
     * @param {api_key_tenant_link} item - The Record to insert
     * @return {Promise<api_key_tenant_link>}
     * @throws {Error} If there wasn't anything inserted or more than one record was inserted
     * */
    public async insert(item: api_key_tenant_link): Promise<api_key_tenant_link> {
        return await this.db.transaction(async (tx) => {
            const new_record = await tx
                .insert(api_keys_tenants_link)
                .values({
                    tenants_id: item.tenants_id.id,
                    api_keys_id: item.api_keys_id.id,
                })
                .returning();

            if (!new_record?.[0] || new_record.length !== 1) {
                Logger.error(
                    "Panic(DB::DAO::api_key_tenant_link::sqlite_api_key_tenant_link): Could not insert into api_key_tenant_link table! (Either nothing returned or more than one record returned)",
                );
                throw new Error(
                    "Panic(DB::DAO::api_key_tenant_link::sqlite_api_key_tenant_link): Could not insert into api_key_tenant_link table! (Either nothing returned or more than one record returned)",
                );
            }

            const db_record = await tx
                .select({
                    id: api_keys_tenants_link.id,
                    tenants_id: tenants,
                    api_keys_id: api_keys,
                })
                .from(api_keys_tenants_link)
                .innerJoin(api_keys, eq(api_keys.id, api_keys_tenants_link.api_keys_id))
                .innerJoin(tenants, eq(tenants.id, api_keys_tenants_link.tenants_id))
                .where(eq(api_keys_tenants_link.id, new_record[0].id));

            if (!db_record?.[0] || db_record.length !== 1) {
                Logger.error(
                    "Panic(DB::DAO::api_key_tenant_link::sqlite_api_key_tenant_link): Could not insert into api_key_tenant_link table! (Either nothing returned or more than one record returned)",
                );
                throw new Error(
                    "Panic(DB::DAO::api_key_tenant_link::sqlite_api_key_tenant_link): Could not insert into api_key_tenant_link table! (Either nothing returned or more than one record returned)",
                );
            }
            return db_record[0];
        });
    }

    /**
     * @description Get every record from the api_key_tenant_link table
     * @returns {Promise<Array<api_key_tenant_link>>}
     * */
    public async getAll(): Promise<Array<api_key_tenant_link>> {
        return await this.db
            .select({
                id: api_keys_tenants_link.id,
                tenants_id: tenants,
                api_keys_id: api_keys,
            })
            .from(api_keys_tenants_link)
            .innerJoin(api_keys, eq(api_keys.id, api_keys_tenants_link.api_keys_id))
            .innerJoin(tenants, eq(tenants.id, api_keys_tenants_link.tenants_id));
    }

    /**
     * @description Get a specific record (by ID) from the api_key_tenant_link table
     * @param {string} id - The ID of the record you are trying to access
     * @returns {Promise<api_key_tenant_link | null>}
     * @throws {Error} If there's more than one record with the same ID
     * */
    public async getById(id: string): Promise<api_key_tenant_link | null> {
        const records = await this.db
            .select({
                id: api_keys_tenants_link.id,
                tenants_id: tenants,
                api_keys_id: api_keys,
            })
            .from(api_keys_tenants_link)
            .innerJoin(api_keys, eq(api_keys.id, api_keys_tenants_link.api_keys_id))
            .innerJoin(tenants, eq(tenants.id, api_keys_tenants_link.tenants_id))
            .where(eq(api_keys_tenants_link.id, id));

        if (records.length > 1) {
            Logger.error(
                "Panic(DB::DAO::api_key_tenant_link::sqlite_api_key_tenant_link): Could not get by ID in api_key_tenant_link table! (More than one record with the same ID)",
            );
            throw new Error(
                "Panic(DB::DAO::api_key_tenant_link::sqlite_api_key_tenant_link): Could not get by ID in api_key_tenant_link table! (More than one record with the same ID)",
            );
        }

        if (!records?.[0] || records.length === 0) {
            return null;
        }

        return records[0];
    }

    /**
     * @description Get all the records associated with an API Key ID
     * @param {string} api_key_id - The ID of the api key
     * @returns {Promise<Array<api_key_tenant_link>}
     * @throws {Error} If the DAO doesn't return anything
     * */
    public async getByApiKey(api_key_id: string): Promise<Array<api_key_tenant_link>> {
        const records = await this.db
            .select({
                id: api_keys_tenants_link.id,
                tenants_id: tenants,
                api_keys_id: api_keys,
            })
            .from(api_keys_tenants_link)
            .innerJoin(api_keys, eq(api_keys.id, api_keys_tenants_link.api_keys_id))
            .innerJoin(tenants, eq(tenants.id, api_keys_tenants_link.tenants_id))
            .where(eq(api_keys_tenants_link.api_keys_id, api_key_id));

        return records;
    }

    /**
     * @description Get a link entry by providing both tenant id and api key id
     * @param {string} api_key_id - The ID of the api key
     * @param {string} tenant_id - The ID of the tenant
     * @returns {Promise<api_key_tenant_link | null>}
     * */
    public async getByTenantAndKey(
        api_key_id: string,
        tenant_id: string,
    ): Promise<Array<api_key_tenant_link> | null> {
        return await this.db
            .select({
                id: api_keys_tenants_link.id,
                tenants_id: tenants,
                api_keys_id: api_keys,
            })
            .from(api_keys_tenants_link)
            .innerJoin(api_keys, eq(api_keys.id, api_keys_tenants_link.api_keys_id))
            .innerJoin(tenants, eq(tenants.id, api_keys_tenants_link.tenants_id))
            .where(
                and(
                    eq(api_keys_tenants_link.api_keys_id, api_key_id),
                    eq(api_keys_tenants_link.tenants_id, tenant_id),
                ),
            );
    }

    /**
     * @description Fetches all api keys for a given tenant
     * @param {string} tenant_id The ID to filter for
     * @return {Promise<Array<api_key_tenant_link>>}
     * */
    public async getByTenant(tenant_id: string): Promise<Array<api_key_tenant_link>> {
        return await this.db
            .select({
                id: api_keys_tenants_link.id,
                tenants_id: tenants,
                api_keys_id: api_keys,
            })
            .from(api_keys_tenants_link)
            .innerJoin(api_keys, eq(api_keys.id, api_keys_tenants_link.api_keys_id))
            .innerJoin(tenants, eq(tenants.id, api_keys_tenants_link.tenants_id))
            .where(eq(api_keys_tenants_link.tenants_id, tenant_id));
    }

    /**
     * @description Deletes a specified record from the table
     * @param {api_key_tenant_link} id - This is the ID of the record you want to delete
     * @returns {Promise<void>}
     * */
    public async delete(id: api_key_tenant_link): Promise<void> {
        await this.db.delete(api_keys_tenants_link).where(eq(api_keys_tenants_link.id, id.id));
    }

    /**
     * @description Updates a record to a new state
     * @param {api_key_tenant_link} to_update The record to update
     * @returns {Promise<api_key_tenant_link>}
     * @throws {Error} If more than one record was updated
     * */
    public async update(to_update: api_key_tenant_link): Promise<api_key_tenant_link> {
        return await this.db.transaction(async (tx) => {
            const updated_records = await tx
                .update(api_keys_tenants_link)
                .set({
                    tenants_id: to_update.tenants_id.id,
                    api_keys_id: to_update.api_keys_id.id,
                })
                .where(eq(api_keys_tenants_link.id, to_update.id))
                .returning();

            if (updated_records.length > 1) {
                Logger.error(
                    "Panic(DB::DAO::api_key_tenant_link::sqlite_api_key_tenant_link): Could not update in api_key_tenant_table! (More than one record with the same ID)",
                );
                throw new Error(
                    "Panic(DB::DAO::api_key_tenant_link::sqlite_api_key_tenant_link): Could not update in api_key_tenant_table! (More than one record with the same ID)",
                );
            }

            if (!updated_records?.[0] || updated_records.length === 0) {
                Logger.error(
                    "Panic(DB::DAO::api_key_tenant_link::sqlite_api_key_tenant_link): Could not update in api_key_tenant_table! (Did not get anything back from udpate)",
                );
                throw new Error(
                    "Panic(DB::DAO::api_key_tenant_link::sqlite_api_key_tenant_link): Could not update in api_key_tenant_table! (Did not get anything back from udpate)",
                );
            }

            const records_in_table = await tx
                .select({
                    id: api_keys_tenants_link.id,
                    tenants_id: tenants,
                    api_keys_id: api_keys,
                })
                .from(api_keys_tenants_link)
                .innerJoin(api_keys, eq(api_keys.id, api_keys_tenants_link.api_keys_id))
                .innerJoin(tenants, eq(tenants.id, api_keys_tenants_link.tenants_id))
                .where(eq(api_keys_tenants_link.id, updated_records[0].id));

            if (!records_in_table?.[0] || records_in_table.length === 0) {
                Logger.error(
                    "Panic(DB::DAO::api_key_tenant_link::sqlite_api_key_tenant_link): Could not update in api_key_tenant_table! (Did not get anything back from udpate)",
                );
                throw new Error(
                    "Panic(DB::DAO::api_key_tenant_link::sqlite_api_key_tenant_link): Could not update in api_key_tenant_table! (Did not get anything back from udpate)",
                );
            }

            return records_in_table[0];
        });
    }
}
