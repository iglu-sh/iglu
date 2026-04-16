import type { request } from "@/db_types";
import SQLiteConnector from "../../Connectors/SQLite";
import { requests } from "../../schema_sqlite";
import Logger from "@/logger";
import { eq } from "drizzle-orm";

export default class sqlite_requests {
    private db = new SQLiteConnector().getDB();

    /**
     * @description Inserts a record into the requests Table
     * @param {request} item - The Record to insert
     * @returns {Promise<request>}
     * @throws {Error} If record could not be inserted or more than one record returned (somehow) from the insert function
     * */
    public async insert(item: request): Promise<request> {
        const to_insert: typeof requests.$inferInsert = {
            ...item,
            id: undefined,
        };
        const inserted_record = await this.db.insert(requests).values(to_insert).returning();

        if (!inserted_record?.[0] || inserted_record.length !== 1) {
            Logger.error(
                "Panic(DB::DAO::requests::sqlite_requests): Could not insert into requests table! (Either nothing returned or more than one record returned)",
            );
            throw new Error(
                "Panic(DB::DAO::requests::sqlite_requests): Could not insert into requests table! (Either nothing returned or more than one record returned)",
            );
        }

        return inserted_record[0];
    }

    /**
     * @description Gets every record from the requests Table (very large be carefull)
     * @returns {Promise<Array<request>>}
     * */
    public async getAll(): Promise<Array<request>> {
        return await this.db.select().from(requests);
    }

    /**
     * @description Gets a specified request from the requests Table
     * @param {string} id - The ID of the request
     * @returns {Promise<request|null>} - Null in Case there wasn't anything to return
     * */
    public async getById(id: string): Promise<request | null> {
        const return_items = await this.db.select().from(requests).where(eq(requests.id, id));
        if (!return_items?.[0]) {
            return null;
        }
        return return_items[0];
    }

    /**
     * @description Deletes a specified request
     * @param {string} id - The ID of the request
     * @returns {Promise<void>}
     * */
    public async delete(id: string): Promise<void> {
        await this.db.delete(requests).where(eq(requests.id, id));
    }

    /**
     * @description Update a request
     * @param {request} item - The record you want to update
     * @returns {Promise<request>} The new state of the record you updated
     * @throws {Error} - If nothing was updated or more than one record was updated
     * */
    public async update(item: request): Promise<request> {
        const updated_record = await this.db
            .update(requests)
            .set({
                ...item,
                id: undefined,
            })
            .where(eq(requests.id, item.id))
            .returning();

        if (!updated_record?.[0] || updated_record.length !== 1) {
            Logger.error(
                "Panic(DB::DAO::requests::sqlite_requests): Could not update requests table! (Either nothing updated or more than one record updated)",
            );
            throw new Error(
                "Panic(DB::DAO::requests::sqlite_requests): Could not update requests table! (Either nothing updated or more than one record updated)",
            );
        }

        return updated_record[0];
    }
}
