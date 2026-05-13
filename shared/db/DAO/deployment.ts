import Logger from "../../logger/Logger";
import type { deployment } from "../../types/schema";
import type { deployment_abstract } from "./abstracts/deployment_abstract";
import { DAO } from "./DAO";
import { sqlite_deployment } from "./sqlite/deployment";

export class Deployments implements deployment_abstract {
    private dao: deployment_abstract = ((): deployment_abstract => {
        let return_class: deployment_abstract | undefined;
        if (DAO.getType() === "SQLite") {
            return_class = new sqlite_deployment();
        }

        if (!return_class) {
            Logger.error(
                "panic(DAO::deployments): Did not receive valid DAO. Is the Database type supported?",
            );
            throw new Error(
                "panic(DAO::deployments): Did not receive valid DAO. Is the Database type supported?",
            );
        }

        return return_class;
    })();

    /**
     * @description Creates a new deployment in the database
     * @param {deployment} item The deployment to create
     * @returns {Promise<deployment>} The created deployment
     * @throws {Error} If the deployment could not be created
     * */
    public async insert(item: deployment): Promise<deployment> {
        return await this.dao.insert(item);
    }

    /**
     * @description Gets every deployment from the database
     * @returns {Array<deployment>}
     * */
    public async getAll(): Promise<deployment[]> {
        return await this.dao.getAll();
    }

    /**
     * @description Gets a deployment by id
     * @param {string} id the ID to fetch
     * @returns {Promise<deployment | null}
     * */
    public async getById(id: string): Promise<deployment | null> {
        return await this.dao.getById(id);
    }

    /**
     * @description Deletes a deployment
     * @param {deployment} item The Deployment to delete
     * @returns {Promise<void>}
     * @throws {Error} If the Deployment could not be deleted
     * */
    public async delete(item: deployment): Promise<void> {
        return await this.dao.delete(item);
    }

    /**
     * @description Returns the **current** index of the newest deployment in the database (i.e: if you are inserting a new deployment you'll have to add +1 to that index)
     * @param {string} tenant_id The ID you are requesting the Index for
     * @returns {Promise<number>}
     * */
    public async getIndexForTenantDeployment(tenant_id: string): Promise<number> {
        return await this.dao.getIndexForTenantDeployment(tenant_id);
    }

    /**
     * @description Update a deployment to a new state, given in the item param
     * @param {deployment} item The new state of the deployment and the id
     * @returns {Promise<deployment>} The new state of the deployment
     * @throws {Error} If the Deployment could not be updated
     * */
    public async update(item: deployment): Promise<deployment> {
        return await this.dao.update(item);
    }
}
