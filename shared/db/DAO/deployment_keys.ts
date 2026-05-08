import type { deployment_key } from "@/db_types";
import Logger from "@/logger";
import type { deployment_key_abstract } from "./abstracts/deployment_key_abstract";
import { DAO } from "./DAO";
import { sqlite_deployment_keys } from "./sqlite/deployment_keys";

export class Deployment_keys implements deployment_key_abstract {
    private type = DAO.getType();
    private dao: deployment_key_abstract = ((): deployment_key_abstract => {
        let return_class: deployment_key_abstract | undefined;
        if (this.type === "SQLite") {
            return_class = new sqlite_deployment_keys();
        }

        if (!return_class) {
            Logger.error(
                "panic(DAO::deployment_keys): Did not receive valid DAO. Is the Database type supported?",
            );
            throw new Error(
                "panic(DAO::deployment_keys): Did not receive valid DAO. Is the Database type supported?",
            );
        }

        return return_class;
    })();

    /**
     * @description Creates a new deployment key in the database
     * @param {deployment_key} item The item to create
     * @returns {Promise<deployment_key>}
     * @throws {Error} If nothing was created or more than one was created
     * */
    public async insert(item: deployment_key): Promise<deployment_key> {
        return await this.dao.insert(item);
    }

    /**
     * @description Gets everything from the table
     * @returns {Promise<Array<deployment_key>>}
     * */
    public async getAll(): Promise<Array<deployment_key>> {
        return await this.dao.getAll();
    }

    /**
     * @description Gets a key by the specified raw deployment key
     * @param {string} hash The key to use
     * @returns {Promise<deployment_key|null>}
     * */
    public async getByHash(hash: string): Promise<deployment_key | null> {
        return await this.dao.getByHash(hash);
    }

    /**
     * @description Gets a key by its specified ID
     * @param {string} id The ID to filter by
     * @returns {Promise<deployment_key|null>}
     * */
    public async getById(id: string): Promise<deployment_key | null> {
        return await this.dao.getById(id);
    }

    /**
     * @description Gets a key by the specified name and tenant id
     * @param {string} name The name of the key you are searching for
     * @param {string} tenant_id The id of the tenant you are searching for
     * @returns {Promise<Array<deployment_key>>}
     * */
    public async getByNameAndTenant(
        name: string,
        tenant_id: string,
    ): Promise<Array<deployment_key>> {
        return await this.dao.getByNameAndTenant(name, tenant_id);
    }

    /**
     * @description Deletes a given deployment_key
     * @param {deployment_key} item The key to delete
     * @returns {Promise<void>}
     * */
    public async delete(item: deployment_key): Promise<void> {
        await this.dao.delete(item);
    }

    /**
     * @description Updates a key to a new state
     * @param {deployment_key} item The key and new state of it
     * @returns {Promise<deployment_key>}
     * @throws {Error} In case nothing was updated or more than on record was updated
     * */
    public async update(item: deployment_key): Promise<deployment_key> {
        return await this.dao.update(item);
    }
}
