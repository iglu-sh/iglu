import Logger from "../../logger/Logger";
import type { agents_deployments_link } from "../../types/schema";
import type { agent_deployment_link_abstract } from "./abstracts/agent_deployment_link_abstract";
import { DAO } from "./DAO";
import { postgres_agents_deployments_links } from "./postgres/agents_deployments_links";
import { sqlite_agents_deployments_links } from "./sqlite/agents_deployments_links";
export class Agents_deployments_links implements agent_deployment_link_abstract {
    private dao: agent_deployment_link_abstract = ((): agent_deployment_link_abstract => {
        let return_class: agent_deployment_link_abstract | undefined;
        if (DAO.getType() === "SQLite") {
            return_class = new sqlite_agents_deployments_links();
        }
        if (DAO.getType() === "Postgres") {
            return_class = new postgres_agents_deployments_links();
        }

        if (!return_class) {
            Logger.error(
                "panic(DAO::agents_deployments_links): Did not receive valid DAO. Is the Database type supported?",
            );
            throw new Error(
                "panic(DAO::agents_deployments_links): Did not receive valid DAO. Is the Database type supported?",
            );
        }

        return return_class;
    })();

    /**
     * @description Creates a new agent in the database
     * @param {agents_deployments_link} item The Agent to create
     * @returns {Promise<agents_deployments_link>} The created agent
     * @throws {Error} If the agent could not be created
     * */
    public async insert(item: agents_deployments_link): Promise<agents_deployments_link> {
        return await this.dao.insert(item);
    }

    /**
     * @description Gets every deployment from the database
     * @returns {Promise<Array<agents_deployments_link>>}
     * */
    public async getAll(): Promise<Array<agents_deployments_link>> {
        return await this.dao.getAll();
    }

    /**
     * @description Gets an agent by id
     * @param {string} id The ID to fetch
     * @returns {Promise<agents_deployments_link | null>}
     * */
    public async getById(id: string): Promise<agents_deployments_link | null> {
        return await this.dao.getById(id);
    }

    /**
     * @description Deletes an agent
     * @param {agents_deployments_link} item The agent to delete
     * @returns {Promise<void>}
     * @throws {Error} If the agent could not be deleted
     * */
    public async delete(item: agents_deployments_link): Promise<void> {
        return await this.dao.delete(item);
    }

    /**
     * @description Updates an agent to a new state, given in the item param
     * @param {agents_deployments_link} item The new state of the agent
     * @returns {Promise<agents_deployments_link>} The new state of the agent
     * @throws {Error} If the Agent could not be updated
     * */
    public async update(item: agents_deployments_link): Promise<agents_deployments_link> {
        return await this.dao.update(item);
    }
}
