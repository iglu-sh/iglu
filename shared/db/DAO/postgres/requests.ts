import { desc, eq } from "drizzle-orm";
import Logger from "../../../logger/Logger";
import type { request } from "../../../types/schema";
import PostgresConnector from "../../Connectors/Postgres";
import { requests } from "../../schema_pg";
import type { requests_abstract } from "../abstracts/requests_asbtract";

export default class postgres_requests implements requests_abstract {
    private db = new PostgresConnector().getDB();

    /**
     * @description Inserts a record into the requests Table
     * @param {request} item - The Record to insert
     * @returns {Promise<request>}
     * @throws {Error} If record could not be inserted or more than one record returned (somehow) from the insert function
     * */
    public async insert(item: request): Promise<request> {
        const to_insert: typeof requests.$inferInsert = {
            ...item,
            date: undefined,
            id: undefined,
        };
        const inserted_record = await this.db.insert(requests).values(to_insert).returning();

        if (!inserted_record?.[0] || inserted_record.length !== 1) {
            Logger.error(
                "Panic(DB::DAO::requests::postgres_requests): Could not insert into requests table! (Either nothing returned or more than one record returned)",
            );
            throw new Error(
                "Panic(DB::DAO::requests::postgres_requests): Could not insert into requests table! (Either nothing returned or more than one record returned)",
            );
        }

        return inserted_record[0];
    }

    /**
     * @description Allows to insert requests as a transaction instead of on their own
     * @param {Array<request>} requests_array
     * @returns {Promise<void>}
     * */
    public async bulk_insert(requests_array: Array<request>): Promise<void> {
        await this.db.transaction(async (tx) => {
            await tx.insert(requests).values(
                requests_array.map((x) => {
                    return {
                        ...x,
                        id: undefined,
                        date: undefined,
                    };
                }),
            );
        });
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
     * @description Gets the latest request for a given derivation, ordered by timestamp
     * @param {string} link_id - The link ID
     * @returns {Promise<request|null|} - Null in case there is no request matching the criteria (should not happen but who knows)
     * */
    public async getLatestRequestForLink(link_id: string): Promise<request | null> {
        const return_items = await this.db
            .select()
            .from(requests)
            .where(eq(requests.derivations_tenants_links, link_id))
            .orderBy(desc(requests.date))
            .limit(1);
        if (!return_items[0]) {
            return null;
        }
        return return_items[0];
    }

    /**
     * @description Remove all requests that are referring to a specific derivation_tenant_link
     * @param {string} link_id - The link ID
     * @returns {Promise<void>}
     * */
    public async removeAllForLink(link_id: string): Promise<void> {
        await this.db.delete(requests).where(eq(requests.derivations_tenants_links, link_id));
    }
    /**
     * @description Deletes a specified request
     * @param {request} id - The ID of the request
     * @returns {Promise<void>}
     * */
    public async delete(id: request): Promise<void> {
        await this.db.delete(requests).where(eq(requests.id, id.id));
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
                "Panic(DB::DAO::requests::postgres_requests): Could not update requests table! (Either nothing updated or more than one record updated)",
            );
            throw new Error(
                "Panic(DB::DAO::requests::postgres_requests): Could not update requests table! (Either nothing updated or more than one record updated)",
            );
        }

        return updated_record[0];
    }
}
