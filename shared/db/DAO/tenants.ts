import type { tenant as tenant_item } from "@/db_types";
import Logger from "@/logger";
import type { tenants_abstract } from "./abstracts/tenants_abstract";
import { DAO } from "./DAO";
import SQLiteTenants from "./sqlite/tenants";
export default class Tenants implements tenants_abstract {
    private dao: tenants_abstract = ((): tenants_abstract => {
        let return_class: tenants_abstract | undefined;
        const type = DAO.getType()
        if (type === "SQLite") {
            return_class = new SQLiteTenants();
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
     * @description Inserts a record into the tenants table
     * @param {tenant} item - The tenant data to be inserted (ID is ignored but should be kept for API consistency in your object. In this case, ID may be an empty string)
     * @returns {Promise<tenant>} - The created tenant
     * @throws {Error} - If inserting fails or nothing is returned from the database
     * */
    public async insert(item: tenant_item): Promise<tenant_item> {
        return await this.dao.insert(item);
    }

    /**
     * @description Gets all the records of the tenants table and returns them in an array
     * @returns {Promise<Array<tenant>>}
     * */
    public async getAll(): Promise<Array<tenant_item>> {
        return await this.dao.getAll();
    }

    /**
     * @description Get a tenant by name
     * @param {string} name - The name of the tenant
     * @returns {Promise<Array<tenant_item>>}
     * */
    public async getByName(name: string): Promise<Array<tenant_item>> {
        return await this.dao.getByName(name);
    }

    /**
     * @description Attempts to find a record in the tenants table associated with the given ID
     * @param {string} id - The ID of the record you are trying to access
     * @returns {Promise<tenant | null>}
     * @throws {Error} - If there's more than one record with the associated ID
     * */
    public async getById(id: string): Promise<tenant_item | null> {
        return await this.dao.getById(id);
    }

    /**
     * @description Deletes a tenant. Only the ID field in this tenant object is really required, everything else should be fine to leave out (or empty strings)
     * @param {tenant} item - The tenant object which contains the ID of the record to delete
     * @returns {Promise<void>}
     * */
    public async delete(item: tenant_item): Promise<void> {
        return await this.dao.delete(item);
    }

    /**
     * @description Updates a given record (comparing by ID) to a new state given in the same object.
     * @param {tenant} item - The object containing the ID and the new values for that ID
     * @returns {tenant} - The updated tenant
     * @throws {Error} - In case nothing was updated, or more than one record was updated
     * */
    public async update(item: tenant_item): Promise<tenant_item> {
        return await this.dao.update(item);
    }
}
