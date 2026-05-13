import Logger from "../../logger/Logger";
import type { agent } from "../../types/schema";
import type { agent_abstract } from "./abstracts/agent_abstract";
import { DAO } from "./DAO";
import { sqlite_agent } from "./sqlite/agent";
export class Agents implements agent_abstract {
    private dao: agent_abstract = ((): agent_abstract => {
        let return_class: agent_abstract | undefined;
        if (DAO.getType() === "SQLite") {
            return_class = new sqlite_agent();
        }

        if (!return_class) {
            Logger.error(
                "panic(DAO::agents): Did not receive valid DAO. Is the Database type supported?",
            );
            throw new Error(
                "panic(DAO::agents): Did not receive valid DAO. Is the Database type supported?",
            );
        }

        return return_class;
    })();

    /**
     * @description Creates a new agent in the database
     * @param {agent} item The Agent to create
     * @returns {Promise<agent>} The created agent
     * @throws {Error} If the agent could not be created
     * */
    public async insert(item: agent): Promise<agent> {
        return await this.dao.insert(item);
    }

    /**
     * @description Gets every deployment from the database
     * @returns {Promise<Array<deployment>>}
     * */
    public async getAll(): Promise<Array<agent>> {
        return await this.dao.getAll();
    }

    /**
     * @description Gets an Agent by its name and a tenant ID
     * @param {string} agent_name The agent name
     * @param {string} tenant The tenant **id**
     * @returns {Promise<Array<agent>>}
     * */
    public async getByNameAndTenant(agent_name: string, tenant: string): Promise<Array<agent>> {
        return await this.dao.getByNameAndTenant(agent_name, tenant);
    }

    /**
     * @description Gets an agent by id
     * @param {string} id The ID to fetch
     * @returns {Promise<agent | null>}
     * */
    public async getById(id: string): Promise<agent | null> {
        return await this.dao.getById(id);
    }

    /**
     * @description Deletes an agent
     * @param {agent} item The agent to delete
     * @returns {Promise<void>}
     * @throws {Error} If the agent could not be deleted
     * */
    public async delete(item: agent): Promise<void> {
        return await this.dao.delete(item);
    }

    /**
     * @description Updates an agent to a new state, given in the item param
     * @param {agent} item The new state of the agent
     * @returns {Promise<agent>} The new state of the agent
     * @throws {Error} If the Agent could not be updated
     * */
    public async update(item: agent): Promise<agent> {
        return await this.dao.update(item);
    }
}
