import { eq } from "drizzle-orm";
import type { api_key } from "../../../types/schema";
import Logger from "../../../logger/Logger";
import SQLiteConnector from "../../Connectors/SQLite";
import { api_keys } from "../../schema_sqlite";
import type { api_key_abstract } from "../abstracts/api_key_abstract";

export default class sqlite_api_keys implements api_key_abstract {
    private db = new SQLiteConnector().getDB();

    /**
     * @description Inserts a new record into the api keys table
     * @param {api_key} item - The record to into the table
     * @returns {Promise<api_key>}
     * @throws {Error} If nothing is inserted or more than one record is inserted
     * */
    public async insert(item: api_key): Promise<api_key> {
        const inserted_record = await this.db
            .insert(api_keys)
            .values({
                ...item,
                id: undefined,
            } as typeof api_keys.$inferInsert)
            .returning();

        if (!inserted_record?.[0] || inserted_record.length !== 1) {
            Logger.error(
                "Panic(DB::DAO::requests::sqlite_requests): Could not insert into api_keys table! (Either nothing returned or more than one record returned)",
            );
            throw new Error(
                "Panic(DB::DAO::requests::sqlite_requests): Could not insert into api_keys table! (Either nothing returned or more than one record returned)",
            );
        }

        return inserted_record[0];
    }

    /**
     * @description Gets every record from the api keys table
     * @returns {Promise<Array<api_key>>}
     * */
    public async getAll(): Promise<Array<api_key>> {
        return await this.db.select().from(api_keys);
    }

    /**
     * @description Get by ID
     * @param {string} id The ID of the record you are trying to access
     * @returns {Promise<api_key|null>}
     * @throws {Error} If there's more than one record with the given ID
     * */
    public async getById(id: string): Promise<api_key | null> {
        const record = await this.db.select().from(api_keys).where(eq(api_keys.id, id));

        if (!record?.[0] || record.length === 0) {
            return null;
        }
        if (record.length !== 1) {
            Logger.error(
                "Panic(DB::DAO::requests::sqlite_requests): Could not fetch from api_keys table! (More than one record for an ID)",
            );
            throw new Error(
                "Panic(DB::DAO::requests::sqlite_requests): Could not fetch from api_keys table! (More than one record for an ID)",
            );
        }

        return record[0];
    }

    /**
     * @description Attempt to find an API key using the hashed key
     * @param {string} to_find
     * @returns {Promise<api_key|null>}
     * @throws {Error}
     * */
    public async getByHash(to_find: string): Promise<api_key | null> {
        const record = await this.db.select().from(api_keys).where(eq(api_keys.hash, to_find));
        if (!record?.[0] || record.length === 0) {
            return null;
        }

        if (record.length > 1) {
            Logger.error(
                "Panic(DB::DAO::requests::sqlite_requests): Could not fetch from api_keys table! (More than one record for a hash)",
            );
            throw new Error(
                "Panic(DB::DAO::requests::sqlite_requests): Could not fetch from api_keys table! (More than one record for a hash)",
            );
        }

        return record[0];
    }

    /**
     * @description Deletes an api_key.
     * @param {api_key} item - The ID you are trying to delete
     * @returns{Promise<void>}
     * */
    public async delete(item: api_key): Promise<void> {
        await this.db.delete(api_keys).where(eq(api_keys.id, item.id));
    }

    /**
     * @description Updates an api_key
     * @param {string} to_update - The record you are trying to update
     * @returns {api_key}
     * @throws {Error}
     * */
    public async update(to_update: api_key): Promise<api_key> {
        const updated_record = await this.db
            .update(api_keys)
            .set({
                hash: to_update.hash,
                name: to_update.name,
            })
            .returning();

        if (!updated_record?.[0] || updated_record.length === 0) {
            Logger.error(
                "Panic(DB::DAO::requests::sqlite_requests): Could not update api_keys table! (More than one record returned after update)",
            );
            throw new Error(
                "Panic(DB::DAO::requests::sqlite_requests): Could not fetch from api_keys table! (More than one record returned after update)",
            );
        }

        return updated_record[0];
    }
}
