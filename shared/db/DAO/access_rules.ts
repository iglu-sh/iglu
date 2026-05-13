import Logger from "../../logger/Logger";
import type { access_rule } from "../../types/schema";
import type { access_rules_abstract } from "./abstracts/access_rules_abstract";
import { DAO } from "./DAO";
import sqlite_access_rules from "./sqlite/access_rules";
export class Access_Rules implements access_rules_abstract {
    type = DAO.getType();

    private dao: access_rules_abstract = ((): access_rules_abstract => {
        let return_class: access_rules_abstract | undefined;
        if (DAO.getType() === "SQLite") {
            return_class = new sqlite_access_rules();
        }

        if (!return_class) {
            Logger.error(
                "panic(DAO::access_rules): Did not receive valid DAO. Is the Database type supported?",
            );
            throw new Error(
                "panic(DAO::access_rules): Did not receive valid DAO. Is the Database type supported?",
            );
        }

        return return_class;
    })();
    /**
     * @description Inserts a record into the tenants table
     * @param {access_rules} rule - The access rule to be inserted into the table (ID is ignore but should be in your object for API consistency in your object)
     * @returns {Promise<access_rule>} - The created rule
     * @throws {Error} - If inserting fails or nothing is returned from the database
     * */
    public async insert(rule: access_rule): Promise<access_rule> {
        Logger.debug(`Inserting accessrule ${rule.name}`);
        return await this.dao.insert(rule);
    }

    /**
     * @description Gets all records from the access_rules table
     * @returns {Promise<Array<access_rule>>}
     * */
    public async getAll(): Promise<Array<access_rule>> {
        Logger.debug("Fetching all access rules");
        return await this.dao.getAll();
    }

    /**
     * @description Attempts to find a record in the access_rules table with the given ID
     * @param {string} id - The ID of the record you are trying to access
     * @returns {Promise<access_rule | null>}
     * @throws {Error} - If there's more than one record with the associated ID
     * */
    public async getById(id: string): Promise<access_rule | null> {
        Logger.debug(`Fetching Access Rule with ID: ${id}`);
        return await this.dao.getById(id);
    }

    /**
     * @description Attempts to find all access rules for a given tenantID
     * @param {string} tenant_id The ID of the tenant you would like to retrieve access_rules for
     * @returns {Promise<Array<access_rule>}
     * */
    public async getByTenant(tenant_id: string): Promise<Array<access_rule>> {
        return await this.dao.getByTenant(tenant_id);
    }

    /**
     * @description Gets a rule for a given IP (as string)
     * @param {string} ip_address - The IP you want to know about
     * @param {string} tenant_id - The ID of the tenant you want to request for
     * @returns {Promise<Array<access_rule> | null>}
     * */
    public async getByIP(ip_address: string, tenant_id: string): Promise<Array<access_rule>> {
        return await this.dao.getByIP(ip_address, tenant_id);
    }

    /**
     * @description Updates a given record (comparing by ID) to a new state given in the same object
     * @param {access_rule} to_update - The new state of the DB Object
     * @returns {access_rule} - The updated rule
     * @throws {Error} - In case nothing was updated, or more than one record was updated
     */
    public async update(to_update: access_rule): Promise<access_rule> {
        Logger.debug(`Updating Rule with ID ${to_update.id} ${to_update.name}`);
        return await this.dao.update(to_update);
    }

    /**
     * @description Attempts to delete a record from the access_rules table
     * @param {access_rule} to_delete - The rule you want to delete
     * @returns {Promise<void>}
     * */
    public async delete(to_delete: access_rule): Promise<void> {
        Logger.debug(`Deleting Access Rule ${to_delete.id}`);
        return await this.dao.delete(to_delete);
    }
}
