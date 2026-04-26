import type { api_key_tenant_link } from "@/db_types";
import type { api_keys_tenants_links_abstract } from "./abstracts/api_keys_tenants_links_abstract";
import { DAO } from "./DAO";
import sqlite_api_key_tenant_link from "./sqlite/api_key_tenant_link";

export class Api_keys_tenants_link implements api_keys_tenants_links_abstract {
    private dao: api_keys_tenants_links_abstract = ((): api_keys_tenants_links_abstract => {
        let return_class: api_keys_tenants_links_abstract | undefined;
        if (DAO.getType() === "SQLite") {
            return_class = new sqlite_api_key_tenant_link();
        }

        if (!return_class) {
            throw new Error(
                "panic(DAO::deployment_keys): Did not receive valid DAO. Is the Database type supported?",
            );
        }

        return return_class;
    })();

    /**
     * @description Insert into the api_key_tenant_link table
     * @param {api_key_tenant_link} item - The Record to insert
     * @return {Promise<api_key_tenant_link>}
     * @throws {Error} If there wasn't anything inserted or more than one record was inserted
     * */
    public async insert(item: api_key_tenant_link): Promise<api_key_tenant_link> {
        return await this.dao.insert(item);
    }

    /**
     * @description Get every record from the api_key_tenant_link table
     * @returns {Promise<Array<api_key_tenant_link>>}
     * */
    public async getAll(): Promise<api_key_tenant_link[]> {
        return await this.dao.getAll();
    }

    /**
     * @description Get a specific record (by ID) from the api_key_tenant_link table
     * @param {string} id - The ID of the record you are trying to access
     * @returns {Promise<api_key_tenant_link | null>}
     * @throws {Error} If there's more than one record with the same ID
     * */
    public async getById(id: string): Promise<api_key_tenant_link | null> {
        return await this.dao.getById(id);
    }

    /**
     * @description Get all the records associated with an API Key ID
     * @param {string} api_key_id - The ID of the api key
     * @returns {Promise<Array<api_key_tenant_link>}
     * @throws {Error} If the DAO doesn't return anything
     * */
    public async getByApiKey(api_key_id: string): Promise<Array<api_key_tenant_link>> {
        return await this.dao.getByApiKey(api_key_id);
    }

    /**
     * @description Get a link entry by providing both tenant id and api key id
     * @param {string} api_key_id - The ID of the api key
     * @param {string} tenant_id - The ID of the tenant
     * @returns {Promise<api_key_tenant_link | null>}
     * @throws {Error} If the DAO doesn't return anything
     * */
    public async getByTenantAndKey(
        api_key_id: string,
        tenant_id: string,
    ): Promise<Array<api_key_tenant_link> | null> {
        return await this.dao.getByTenantAndKey(api_key_id, tenant_id);
    }

    /**
     * @description Deletes a specified record from the table
     * @param {api_key_tenant_link} item - This is the record you want to delete
     * @returns {Promise<void>}
     * */
    public async delete(item: api_key_tenant_link): Promise<void> {
        return await this.dao.delete(item);
    }

    /**
     * @description Updates a record to a new state
     * @param {api_key_tenant_link} item The record to update
     * @returns {Promise<api_key_tenant_link>}
     * @throws {Error} If more than one record was updated
     * */
    public async update(item: api_key_tenant_link): Promise<api_key_tenant_link> {
        return await this.dao.update(item);
    }
}
