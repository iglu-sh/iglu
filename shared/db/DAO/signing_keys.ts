import type { signing_key } from "../../types/schema";
import Logger from "../../logger/Logger";
import type { signing_keys_abstract } from "./abstracts/signing_keys_abstract";
import { DAO } from "./DAO";
import sqlite_signing_keys from "./sqlite/signing_keys";

export class Signing_Keys implements signing_keys_abstract {
    private dao: signing_keys_abstract = ((): signing_keys_abstract => {
        let return_class: signing_keys_abstract | undefined;
        if (DAO.getType() === "SQLite") {
            return_class = new sqlite_signing_keys();
        }

        if (!return_class) {
            Logger.error(
                "panic(DAO::signing_keys): Did not receive valid DAO. Is the Database type supported?",
            );
            throw new Error(
                "panic(DAO::signing_keys): Did not receive valid DAO. Is the Database type supported?",
            );
        }

        return return_class;
    })();

    /**
     * @description Insert a new Signing Key into the Database
     * @param {signing_key} item
     * @returns {Promise<signing_key>}
     * */
    public async insert(item: signing_key): Promise<signing_key> {
        return await this.dao.insert(item);
    }

    /**
     * @description Gets all records out of the signing_keys table
     * @returns {Promise<Array<signing_key>>}
     * */
    public async getAll(): Promise<Array<signing_key>> {
        return await this.dao.getAll();
    }

    /**
     * @description Filter the signing keys table by api key
     * @param {string} key_id - The Key ID
     * @returns {Promise<signing_key|null>}
     * */
    public async getByApiKeyId(key_id: string): Promise<signing_key | null> {
        return await this.dao.getByApiKeyId(key_id);
    }

    /**
     * @description Attempts to find a record in the signing_keys table with the given ID
     * @param {string} id - The ID of the record you are trying to access
     * @returns {Promise<signing_key | null>} - (null if there's no record found)
     * @throws {Error} - If there's more than one record with the given ID
     * */
    public async getById(id: string): Promise<signing_key | null> {
        return await this.dao.getById(id);
    }

    /**
     * @description Finds all Signing Keys associated with a given Tenant ID
     * @param {string} tenant_id - The ID of the tenant
     * @returns {Promise<Array<signing_key>>}
     * */
    public async getByTenant(tenant_id: string): Promise<Array<signing_key>> {
        return await this.dao.getByTenant(tenant_id);
    }

    /**
     * @description Deletes a signing_key. Only the ID field is respected in the given object
     * @param {signing_key} to_delete - The signing key object that contains the ID of the record to delete
     * @returns {Promise<void>}
     * */
    public async delete(to_delete: signing_key): Promise<void> {
        await this.dao.delete(to_delete);
    }

    /**
     * @description Updates a given record (comparing by ID) to a new state given in the to_update object
     * @param {signing_key} to_update - The object containing the ID and the desired state of the object
     * @returns {signing_key}
     * @throws {Error}
     * */
    public async update(to_update: signing_key): Promise<signing_key> {
        return await this.dao.update(to_update);
    }
}
