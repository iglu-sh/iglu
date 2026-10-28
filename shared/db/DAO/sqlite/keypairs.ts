import { eq } from "drizzle-orm";
import Logger from "../../../logger/Logger";
import type { keypair } from "../../../types";
import SqliteConnector from "../../Connectors/SQLite";
import { api_keys, keypairs, signing_keys, tenants } from "../../schema_sqlite";
import type { keypairs_abstract } from "../abstracts/keypairs_abstract";

export default class sqlite_keypairs implements keypairs_abstract {
    private db = new SqliteConnector().getDB();

    /**
     * @description Inserts a record into the keypairs table
     * @param {keypair} item - The keypair data
     * @return {Promise<keypair>}
     * @throws {Error} If there wasn't anything inserted or more than one record was inserted
     * */
    public async insert(item: keypair): Promise<keypair> {
        return await this.db.transaction(async (tx) => {
            const new_record = await tx
                .insert(keypairs)
                .values({
                    ...item,
                    tenants_id: item.tenants_id.id,
                    signing_keys_id: item.signing_keys_id.id,
                    id: undefined,
                })
                .returning();

            if (!new_record?.[0] || new_record.length !== 1) {
                Logger.error(
                    "Panic(DB::DAO::keypairs::sqlite_keypairs): Could not insert into keypairs table! (Either nothing returned or more than one record returned)",
                );
                throw new Error(
                    "Panic(DB::DAO::keypairs::sqlite_keypairs): Could not insert into keypairs table! (Either nothing returned or more than one record returned)",
                );
            }

            const db_record = await tx
                .select({
                    id: keypairs.id,
                    private_key: keypairs.private_key,
                    signing_keys_id: signing_keys,
                    tenants_id: tenants,
                    api_keys_id: api_keys,
                    managed_by: keypairs.managed_by,
                })
                .from(keypairs)
                .innerJoin(signing_keys, eq(signing_keys.id, keypairs.signing_keys_id))
                .innerJoin(tenants, eq(tenants.id, keypairs.tenants_id))
                .innerJoin(api_keys, eq(signing_keys.api_keys_id, api_keys.id))
                .where(eq(keypairs.id, new_record[0].id));
            if (!db_record?.[0] || db_record.length !== 1) {
                Logger.error(
                    "Panic(DB::DAO::keypairs::sqlite_keypairs): Could not insert into keypairs table! (Either nothing returned or more than one record returned)",
                );
                throw new Error(
                    "Panic(DB::DAO::keypairs::sqlite_keypairs): Could not insert into keypairs table! (Either nothing returned or more than one record returned)",
                );
            }

            return {
                id: db_record[0].id,
                private_key: db_record[0].private_key,
                tenants_id: db_record[0].tenants_id,
                managed_by: db_record[0].managed_by,
                signing_keys_id: {
                    ...db_record[0].signing_keys_id,
                    api_keys_id: db_record[0].api_keys_id,
                },
            };
        });
    }

    /**
     * @description Get every record from the keypairs table
     * @returns {Promise<Array<keypair>>}
     * */
    public async getAll(): Promise<Array<keypair>> {
        return await this.db
            .select({
                id: keypairs.id,
                private_key: keypairs.private_key,
                signing_keys_id: signing_keys,
                tenants_id: tenants,
                api_keys_id: api_keys,
                managed_by: keypairs.managed_by,
            })
            .from(keypairs)
            .innerJoin(signing_keys, eq(signing_keys.id, keypairs.signing_keys_id))
            .innerJoin(tenants, eq(tenants.id, keypairs.tenants_id))
            .innerJoin(api_keys, eq(signing_keys.api_keys_id, api_keys.id))
            .then((result) => {
                return result.map((x) => {
                    return {
                        id: x.id,
                        private_key: x.private_key,
                        tenants_id: x.tenants_id,
                        managed_by: x.managed_by,
                        signing_keys_id: {
                            ...x.signing_keys_id,
                            api_keys_id: x.api_keys_id,
                        },
                    };
                });
            });
    }

    /**
     * @description Get a specific record (by ID) from the keypairs table
     * @param {string} id - The ID of the record you want to access
     * @returns {Promise<keypair | null>}
     * @throws {Error} If there's more than one record with the same ID
     * */
    public async getById(id: string): Promise<keypair | null> {
        const records = await this.db
            .select({
                id: keypairs.id,
                private_key: keypairs.private_key,
                signing_keys_id: signing_keys,
                tenants_id: tenants,
                api_keys_id: api_keys,
                managed_by: keypairs.managed_by,
            })
            .from(keypairs)
            .innerJoin(signing_keys, eq(signing_keys.id, keypairs.signing_keys_id))
            .innerJoin(tenants, eq(tenants.id, keypairs.tenants_id))
            .innerJoin(api_keys, eq(signing_keys.api_keys_id, api_keys.id))
            .where(eq(keypairs.id, id));

        if (records.length > 1) {
            Logger.error(
                "Panic(DB::DAO::keypairs::sqlite_keypairs): Could not get by ID in keypairs table! (More than one record with the same ID)",
            );
            throw new Error(
                "Panic(DB::DAO::keypairs::sqlite_keypairs): Could not get by ID in keypairs table! (More than one record with the same ID)",
            );
        }

        if (!records?.[0] || records.length === 0) {
            return null;
        }

        return {
            id: records[0].id,
            private_key: records[0].private_key,
            managed_by: records[0].managed_by,
            signing_keys_id: {
                ...records[0].signing_keys_id,
                api_keys_id: records[0].api_keys_id,
            },
            tenants_id: records[0].tenants_id,
        };
    }

    /**
     * @description Get a specific keypair associated with a tenant
     * @param {string} tenant_id - The ID of the tenant you want to access
     * @returns {Promise<keypair | null>}
     * @throws {Error} If there's more than one record with the same tenant_id
     * */
    public async getByTenant(tenant_id: string): Promise<keypair | null> {
        const records = await this.db
            .select({
                id: keypairs.id,
                private_key: keypairs.private_key,
                signing_keys_id: signing_keys,
                tenants_id: tenants,
                api_keys_id: api_keys,
                managed_by: keypairs.managed_by,
            })
            .from(keypairs)
            .innerJoin(signing_keys, eq(signing_keys.id, keypairs.signing_keys_id))
            .innerJoin(tenants, eq(tenants.id, keypairs.tenants_id))
            .innerJoin(api_keys, eq(signing_keys.api_keys_id, api_keys.id))
            .where(eq(keypairs.tenants_id, tenant_id));

        if (records.length > 1) {
            Logger.error(
                "Panic(DB::DAO::keypairs::sqlite_keypairs): Could not get by tenant ID in keypairs table! (More than one record with the same ID)",
            );
            throw new Error(
                "Panic(DB::DAO::keypairs::sqlite_keypairs): Could not get by tenant ID in keypairs table! (More than one record with the same ID)",
            );
        }

        if (!records?.[0] || records.length === 0) {
            return null;
        }

        return {
            id: records[0].id,
            private_key: records[0].private_key,
            managed_by: records[0].managed_by,
            signing_keys_id: {
                ...records[0].signing_keys_id,
                api_keys_id: records[0].api_keys_id,
            },
            tenants_id: records[0].tenants_id,
        };
    }

    /**
     * @description Deletes a given keypair
     * @param {keypair} id The keypair of the keypair to delete
     * @returns {Promise<void>}
     * */
    public async delete(id: keypair): Promise<void> {
        await this.db.delete(keypairs).where(eq(keypairs.id, id.id));
    }

    /**
     * @description Updates a record to a new state
     * @param {keypair} to_update The record to update
     * @returns {Promise<keypair>}
     * @throws {Error} If more than one record was updated
     * */
    public async update(to_update: keypair): Promise<keypair> {
        return await this.db.transaction(async (tx) => {
            const updated_records = await tx
                .update(keypairs)
                .set({
                    private_key: to_update.private_key,
                    signing_keys_id: to_update.signing_keys_id.id,
                    tenants_id: to_update.tenants_id.id,
                    managed_by: to_update.managed_by,
                })
                .where(eq(keypairs.id, to_update.id))
                .returning();

            if (updated_records.length > 1) {
                Logger.error(
                    "Panic(DB::DAO::keypairs::sqlite_keypairs): Could not update in keypairs table! (More than one record with the same ID)",
                );
                throw new Error(
                    "Panic(DB::DAO::keypairs::sqlite_keypairs): Could not update in keypairs table! (More than one record with the same ID)",
                );
            }

            if (!updated_records?.[0] || updated_records.length === 0) {
                Logger.error(
                    "Panic(DB::DAO::keypairs::sqlite_keypairs): Could not update in keypairs! (Did not get anything back from udpate)",
                );
                throw new Error(
                    "Panic(DB::DAO::keypairs::sqlite_keypairs): Could not update in keypairs! (Did not get anything back from udpate)",
                );
            }

            const records_in_table = await this.db
                .select({
                    id: keypairs.id,
                    private_key: keypairs.private_key,
                    signing_keys_id: signing_keys,
                    tenants_id: tenants,
                    api_keys_id: api_keys,
                    managed_by: keypairs.managed_by,
                })
                .from(keypairs)
                .innerJoin(signing_keys, eq(signing_keys.id, keypairs.signing_keys_id))
                .innerJoin(tenants, eq(tenants.id, keypairs.tenants_id))
                .innerJoin(api_keys, eq(signing_keys.api_keys_id, api_keys.id))
                .where(eq(keypairs.tenants_id, updated_records[0].id));

            if (!records_in_table?.[0] || records_in_table.length === 0) {
                Logger.error(
                    "Panic(DB::DAO::keypairs::sqlite_keypairs): Could not update in keypairs! (Did not get anything back from udpate)",
                );
                throw new Error(
                    "Panic(DB::DAO::keypairs::sqlite_keypairs): Could not update in keypairs! (Did not get anything back from udpate)",
                );
            }

            return {
                id: records_in_table[0].id,
                private_key: records_in_table[0].private_key,
                managed_by: records_in_table[0].managed_by,
                signing_keys_id: {
                    ...records_in_table[0].signing_keys_id,
                    api_keys_id: records_in_table[0].api_keys_id,
                },
                tenants_id: records_in_table[0].tenants_id,
            };
        });
    }
}
