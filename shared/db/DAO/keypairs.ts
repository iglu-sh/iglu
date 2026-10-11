import Logger from "../../logger/Logger";
import type { keypair } from "../../types";
import type { keypairs_abstract } from "./abstracts/keypairs_abstract";
import { DAO } from "./DAO";
import postgres_keypairs from "./postgres/keypairs";
import sqlite_keypairs from "./sqlite/keypairs";
export class Keypairs implements keypairs_abstract {
    private dao: keypairs_abstract = ((): keypairs_abstract => {
        let return_class: keypairs_abstract | undefined;
        const type = DAO.getType();
        if (type === "SQLite") {
            return_class = new sqlite_keypairs();
        }
        if (DAO.getType() === "Postgres") {
            return_class = new postgres_keypairs();
        }

        if (!return_class) {
            Logger.error(
                "panic(DAO::tenants): Did not receive valid DAO. Is the Database type supported?",
            );
            throw new Error(
                "panic(DAO::tenants): Did not receive valid DAO. Is the Database type supported?",
            );
        }

        return return_class;
    })();

    /**
     * @description Inserts a record into the keypairs table
     * @param {keypair} item - The keypair data
     * @return {Promise<keypair>}
     * @throws {Error} If there wasn't anything inserted or more than one record was inserted
     * */
    public async insert(item: keypair): Promise<keypair> {
        return await this.dao.insert(item);
    }

    /**
     * @description Get every record from the keypairs table
     * @returns {Promise<Array<keypair>>}
     * */
    public async getAll(): Promise<Array<keypair>> {
        return await this.dao.getAll();
    }

    /**
     * @description Get a specific record (by ID) from the keypairs table
     * @param {string} id - The ID of the record you want to access
     * @returns {Promise<keypair | null>}
     * @throws {Error} If there's more than one record with the same ID
     * */
    public async getById(id: string): Promise<keypair | null> {
        return await this.dao.getById(id);
    }

    /**
     * @description Get a specific keypair associated with a tenant
     * @param {string} tenant_id - The ID of the tenant you want to access
     * @returns {Promise<keypair | null>}
     * @throws {Error} If there's more than one record with the same tenant_id
     * */
    public async getByTenant(tenant_id: string): Promise<keypair | null> {
        return await this.dao.getByTenant(tenant_id);
    }

    /**
     * @description Deletes a given keypair
     * @param {keypair} id The keypair of the keypair to delete
     * @returns {Promise<void>}
     * */
    public async delete(id: keypair): Promise<void> {
        return await this.dao.delete(id);
    }

    /**
     * @description Updates a record to a new state
     * @param {keypair} to_update The record to update
     * @returns {Promise<keypair>}
     * @throws {Error} If more than one record was updated
     * */
    public async update(to_update: keypair): Promise<keypair> {
        return await this.dao.update(to_update);
    }
}
