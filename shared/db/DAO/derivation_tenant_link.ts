import type { derivation_tenant_link } from "@/db_types";
import Logger from "@/logger";
import type { derivation_tenant_links_abstract } from "./abstracts/derivation_tenant_links_abstract";
import { DAO } from "./DAO";
import sqlite_derivation_tenant_link from "./sqlite/derivation_tenant_links";

export default class Derivation_tenant_link implements derivation_tenant_links_abstract {
    private type = DAO.getType();

    private dao: derivation_tenant_links_abstract = ((): derivation_tenant_links_abstract => {
        let return_class: derivation_tenant_links_abstract | undefined;
        if (DAO.getType() === "SQLite") {
            return_class = new sqlite_derivation_tenant_link();
        }

        if (!return_class) {
            Logger.error(
                "panic(DAO::derivation_tenant_link): Did not receive valid DAO. Is the Database type supported?",
            );
            throw new Error(
                "panic(DAO::derivation_tenant_link): Did not receive valid DAO. Is the Database type supported?",
            );
        }
        return return_class;
    })();

    /**
     * @description inserts a new record into the derivation_tenant_link
     * @param {derivation_tenant_link} item - The Record to insert
     * @returns {Promise<derivation_tenant_link>}
     * @throws {Error} If nothing got inserted, or more than one record was inserted
     * */
    public async insert(item: derivation_tenant_link): Promise<derivation_tenant_link> {
        return await this.dao.insert(item);
    }

    /**
     * @description returns **every** record in the derivations table (this table can be very long so use this with caution)
     * @returns {Promise<Array<derivation_tenant_link>>}
     * @throws {Error} if nothing is returned by DAO
     * */
    public async getAll(): Promise<derivation_tenant_link[]> {
        return await this.dao.getAll();
    }

    /**
     * @description returns a derivation link record via given ID
     * @param {string} id - The ID of the record
     * @returns {Promise<derivation_tenant_link | null>}
     * @throws - If more than one record is returned
     * */
    public async getById(id: string): Promise<derivation_tenant_link | null> {
        return await this.dao.getById(id);
    }

    /**
     * @description Returns any **nix store paths** stored in the database which were filtered by a given array
     * @param {Array<string>} paths - The Paths you want to test
     * @param {string} tenant_id - The ID of the tenant you want to check
     * @returns {Promise<Array<derivation_tenant_link>>}
     * */
    public async getByNixStoreHashes(paths: Array<string>, tenant_id: string) {
        return await this.dao.getByNixStoreHashes(paths, tenant_id);
    }

    /**
     * @description Deletes a specified link record
     * @param {derivation_tenant_link} item - The Record to delete
     * @returns {Promise<void>}
     * */
    public async delete(item: derivation_tenant_link): Promise<void> {
        await this.dao.delete(item);
    }

    /**
     * @description Updates a given record to a new state, ignoring nested objects (except the ID field in those)
     * @param {derivation_tenant_link} item - The Record to Update
     * @returns {Promise<derivation_tenant_link}
     * @throws {Error} - If nothing got updated or more than one record was updated, or the DAO didn't return anything
     * */
    public async update(item: derivation_tenant_link): Promise<derivation_tenant_link> {
        return await this.dao.update(item);
    }
}
