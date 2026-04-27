import type { request } from "@/db_types";
import Logger from "@/logger";
import type { requests_abstract } from "./abstracts/requests_asbtract";
import { DAO } from "./DAO";
import sqlite_requests from "./sqlite/requests";
export default class Requests implements requests_abstract {
    private dao: requests_abstract = ((): requests_abstract => {
        let return_class: requests_abstract | undefined;
        if (DAO.getType() === "SQLite") {
            return_class = new sqlite_requests();
        }

        if (!return_class) {
            Logger.error(
                "panic(DAO::requests): Did not receive valid DAO. Is the Database type supported?",
            );
            throw new Error(
                "panic(DAO::requests): Did not receive valid DAO. Is the Database type supported?",
            );
        }
        return return_class;
    })();

    /**
     * @description Inserts a record into the requests Table
     * @param {request} item - The Record to insert
     * @returns {Promise<request>}
     * @throws {Error} If record could not be inserted or more than one record returned (somehow) from the insert function
     * */
    public async insert(item: request): Promise<request> {
        return await this.dao.insert(item);
    }

    /**
     * @description Gets every record from the requests Table (very large be carefull)
     * @returns {Promise<Array<request>>}
     * */
    public async getAll(): Promise<Array<request>> {
        return await this.dao.getAll();
    }

    /**
     * @description Gets a specified request from the requests Table
     * @param {string} id - The ID of the request
     * @returns {Promise<request|null>} - Null in Case there wasn't anything to return
     * */
    public async getById(id: string): Promise<request | null> {
        return await this.dao.getById(id);
    }

    /**
     * @description Gets the latest request for a given derivation, ordered by timestamp
     * @param {string} link_id - The link ID
     * @returns {Promise<request|null|} - Null in case there is no request matching the criteria (should not happen but who knows)
     * */
    public async getLatestRequestForLink(link_id: string): Promise<request | null> {
        return await this.dao.getLatestRequestForLink(link_id);
    }

    /**
     * @description Allows to insert requests as a transaction instead of on their own
     * @param {Array<request>} requests_array
     * @returns {Promise<void>}
     * */
    public async bulk_insert(requests_array: Array<request>): Promise<void> {
        await this.dao.bulk_insert(requests_array);
    }

    /**
     * @description Remove all requests that are referring to a specific derivation_tenant_link
     * @param {string} link_id - The link ID
     * @returns {Promise<void>}
     * */
    public async removeAllForLink(link_id: string): Promise<void> {
        return await this.dao.removeAllForLink(link_id);
    }

    /**
     * @description Deletes a specified request
     * @param {request} item - The ID of the request
     * @returns {Promise<void>}
     * */
    public async delete(item: request): Promise<void> {
        return await this.dao.delete(item);
    }

    /**
     * @description Update a request
     * @param {request} item - The record you want to update
     * @returns {Promise<request>} The new state of the record you updated
     * @throws {Error} - If nothing was updated or more than one record was updated
     * */
    public async update(item: request): Promise<request> {
        return await this.dao.update(item);
    }
}
