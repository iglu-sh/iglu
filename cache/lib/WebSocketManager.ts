import type { agent, agents_deployments_link, deployment } from "@/db_types";
import Logger from "@/logger";
import { Agents } from "../../shared/db/DAO/agents";
import { Agents_deployments_links } from "../../shared/db/DAO/agents_deployments_links";
import { deploy_json_schema } from "../../shared/utils/zod/zod_cachix_schemas";

export class AgentWebSocketManager {
    private static websockets_by_tenant: {
        [key: string]: {
            [key: string]: {
                agent: agent;
                socket: WebSocket;
            };
        };
    } = {};

    /**
     * @description Gets a websocket for a specified tenant
     * @param {string} tenant_id The ID of the tenant you want to access
     * @returns {Array<WebSocket>}
     * */
    public static getWebSocketForTenant(tenant_id: string): {
        [key: string]: {
            agent: agent;
            socket: WebSocket;
        };
    } {
        return AgentWebSocketManager.websockets_by_tenant[tenant_id] ?? {};
    }

    /**
     * @description Stores a websocket connection in the Manager for future reference
     * @param {WebSocket} websocket The websocket to store
     * @param {string} tenant_id The tenant ID this socket is supposed to be stored under
     * @param {agent} agent The name of the agent you want to store
     * @returns {void}
     * */
    public static async storeWebSocketForTenant(
        tenant_id: string,
        agent: agent,
        websocket: WebSocket,
    ): Promise<void> {
        Logger.debug(
            `Storing websocket connection for tenant id: ${tenant_id}, agent id: ${agent.id}`,
        );
        if (!AgentWebSocketManager.websockets_by_tenant[tenant_id]) {
            AgentWebSocketManager.websockets_by_tenant[tenant_id] = {};
        }

        // Check if an agent is already connected, if so then we close the connection
        if (AgentWebSocketManager.websockets_by_tenant[tenant_id][agent.id]) {
            AgentWebSocketManager.websockets_by_tenant[tenant_id][agent.id]!.socket.close();
        }

        await new Agents().update({
            ...agent,
            is_online: true,
        });

        AgentWebSocketManager.websockets_by_tenant[tenant_id] = {
            ...AgentWebSocketManager.websockets_by_tenant[tenant_id],
            [agent.id]: {
                agent: agent,
                socket: websocket,
            },
        };

        websocket.onclose = async () => {
            Logger.debug(`Closing Connection for agent with name: ${agent.name}, id: ${agent.id}`);
            await new Agents().update({
                ...agent,
                is_online: false,
                last_seen: Date.now(),
            });
        };
    }

    /**
     * @description Emits a build event for the connected agent in a specific tenant
     * @param {deployment} deployment_to_run The deployment that is supposed to be emitted
     * @returns {void}
     * */
    public static async emitBuildEvent(
        deployment_to_run: deployment,
    ): Promise<{ [key: string]: agents_deployments_link }> {
        const deployment_json = deploy_json_schema.safeParse(
            JSON.parse(deployment_to_run.deploy_json),
        );
        if (!deployment_json.success) {
            Logger.error(
                `bug(lib::WebSocketManager::AgentWebSocketManager): Deployment json in emitBuild failed to validate`,
            );
            throw new Error(
                `bug(lib::WebSocketManager::AgentWebSocketManager): Deployment json in emitBuild failed to validate`,
            );
        }

        let output = {};

        for (const agent of Object.keys(deployment_json.data.agents)) {
            const agent_in_db = await new Agents().getByNameAndTenant(
                agent,
                deployment_to_run.tenants_id.id,
            );

            // TODO: Implement the ability to deploy not yet connected agents here
            if (!agent_in_db[0] || agent_in_db.length === 0) {
                continue;
            }

            const agent_deployment_link_in_db = await new Agents_deployments_links().insert({
                id: "n/a",
                agents_id: agent_in_db[0],
                deployments_id: deployment_to_run,
                log: "",
                started_at: 0,
                finished_at: null,
                store_path: deployment_json.data.agents[agent] ?? "unknown",
                closure_size: null,
            });

            output = {
                ...output,
                [agent]: agent_deployment_link_in_db,
            };
        }

        return output;
    }
}
