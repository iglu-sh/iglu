import Logger from "../../logger/Logger";
import type { api_key } from "../../types/schema";
import type { api_key_abstract } from "./abstracts/api_key_abstract";
import { DAO } from "./DAO";
import postgres_api_keys from "./postgres/api_keys";
import sqlite_api_keys from "./sqlite/api_keys";

export class Api_keys implements api_key_abstract {
    private dao: api_key_abstract = ((): api_key_abstract => {
        let return_class: api_key_abstract | undefined;
        if (DAO.getType() === "SQLite") {
            return_class = new sqlite_api_keys();
        }
        if (DAO.getType() === "Postgres") {
            return_class = new postgres_api_keys();
        }

        if (!return_class) {
            Logger.error(
                "panic(DAO::api_key): Did not receive valid DAO. Is the Database type supported?",
            );
            throw new Error(
                "panic(DAO::api_key): Did not receive valid DAO. Is the Database type supported?",
            );
        }

        return return_class;
    })();

    /**
     * @description Inserts a new record into the api keys table
     * @param {api_key} item - The record to into the table
     * @returns {Promise<api_key>}
     * @throws {Error} If nothing is inserted or more than one record is inserted
     * */
    public async insert(item: api_key): Promise<api_key> {
        return await this.dao.insert(item);
    }

    /**
     * @description Gets every record from the api keys table
     * @returns {Promise<Array<api_key>>}
     * @throws {Error} if DAO returns nothing
     * */
    public async getAll(): Promise<api_key[]> {
        return await this.dao.getAll();
    }

    /**
     * @description Get by ID
     * @param {string} id The ID of the record you are trying to access
     * @returns {Promise<api_key|null>}
     * @throws {Error} If there's more than one record with the given ID
     * */
    public async getById(id: string): Promise<api_key | null> {
        return await this.dao.getById(id);
    }

    /**
     * @description Attempt to find an API key using the raw key
     * @param {string} to_find
     * @returns {Promise<api_key | null>}
     * @throws {Error}
     * */
    public async getByHash(to_find: string): Promise<api_key | null> {
        return await this.dao.getByHash(to_find);
    }

    /**
     * @description Deletes an api_key.
     * @param {string} item - The ID you are trying to delete
     * @returns{Promise<void>}
     * */
    public async delete(item: api_key): Promise<void> {
        return await this.dao.delete(item);
    }

    /**
     * @description Updates an api_key
     * @param {string} item - The record you are trying to update
     * @returns {api_key}
     * @throws {Error}
     * */
    public async update(item: api_key): Promise<api_key> {
        return await this.dao.update(item);
    }
}
