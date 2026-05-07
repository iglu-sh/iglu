import z from "zod";
import type { agent, agents_deployments_link, deployment } from "@/db_types";
import Logger from "@/logger";
import { Agents } from "../../shared/db/DAO/agents";
import { Agents_deployments_links } from "../../shared/db/DAO/agents_deployments_links";
import MakeRestResponse from "../../shared/utils/rest/MakeResponse";
import { deploy_json_schema } from "../../shared/utils/zod/zod_cachix_schemas";

const log_line_schema = z.object({
    line: z.string(),
    time: z.iso.datetime(),
});

// biome-ignore lint/complexity/noStaticOnlyClass: Needed to share websocket connections between log websocket routes and activate route
export class AgentWebSocketManager {
    private static websockets_by_tenant: {
        [key: string]: {
            [key: string]: {
                agent: agent;
                socket: WebSocket;
            };
        };
    } = {};

    private static log_websocket_by_agent_deployment_id: {
        [key: string]: {
            log: Array<string>;
            sockets: Array<WebSocket>;
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
            (
                AgentWebSocketManager.websockets_by_tenant[tenant_id][agent.id] as {
                    agent: agent;
                    socket: WebSocket;
                }
            ).socket.close();
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
                status: "Pending",
            });

            output = {
                ...output,
                [agent]: agent_deployment_link_in_db,
            };

            let rollback_for_agent: null | string = null;
            if (deployment_json.data.rollbackScripts) {
                if (deployment_json.data.rollbackScripts[agent_in_db[0].os]) {
                    rollback_for_agent = deployment_json.data.rollbackScripts[
                        agent_in_db[0].os
                    ] as string;
                }
                if (deployment_json.data.rollbackScripts[agent_in_db[0].name]) {
                    rollback_for_agent = deployment_json.data.rollbackScripts[
                        agent_in_db[0].name
                    ] as string;
                }
            }

            if (
                AgentWebSocketManager.websockets_by_tenant[deployment_to_run.tenants_id.id]?.[
                    agent_in_db[0].id
                ]
            ) {
                Logger.debug(
                    `Sending build job with ID ${agent_deployment_link_in_db.id} to agent with id: ${agent_in_db[0].id}, name: ${agent_in_db[0].name}`,
                );
                AgentWebSocketManager.websockets_by_tenant[deployment_to_run.tenants_id.id]?.[
                    agent_in_db[0].id
                ]?.socket.send(
                    JSON.stringify({
                        agent: agent_deployment_link_in_db.id,
                        command: {
                            contents: {
                                id: agent_deployment_link_in_db.id,
                                index: agent_deployment_link_in_db.deployments_id.deployment_index,
                                rollbackScript: rollback_for_agent,
                                storePath: deployment_json.data.agents[agent],
                            },
                            tag: "Deployment",
                        },
                        id: deployment_to_run.id,
                        method: "Deployment",
                    }),
                );
            }
        }

        return output;
    }

    /**
     * @description Stores a log endpoint websocket
     * @param {string} agent_deployment_link_id The ID of the build
     * @param {WebSocket} socket The socket to store
     * @returns {Promise<void>}
     * */
    public static async storeLogSocket(
        agent_deployment_link_id: string,
        socket: WebSocket,
    ): Promise<void> {
        const link_in_db = await new Agents_deployments_links().getById(agent_deployment_link_id);
        if (link_in_db === null) {
            Logger.debug(
                `Got connection attempt to a log for a deployment that does not exist or that's already finished`,
            );
            socket.close(
                1000,
                JSON.stringify(
                    MakeRestResponse(1000, "Does not exist or is already finished", true, {
                        error_details:
                            "This deployment either does not exist or is already finished, if you want to access logs go to /api/v1/iglu/deployments/logs/[your_deployment_id]",
                    }),
                ),
            );
            return;
        }
        if (!AgentWebSocketManager.log_websocket_by_agent_deployment_id[agent_deployment_link_id]) {
            AgentWebSocketManager.log_websocket_by_agent_deployment_id = {
                ...AgentWebSocketManager.log_websocket_by_agent_deployment_id,
                [agent_deployment_link_id]: {
                    sockets: [],
                    log: [],
                },
            };
        }

        if (AgentWebSocketManager.log_websocket_by_agent_deployment_id[agent_deployment_link_id]) {
            AgentWebSocketManager.log_websocket_by_agent_deployment_id[
                agent_deployment_link_id
            ].sockets.push(socket);
            Logger.debug(
                `Storing log websocket for agent_deployment_link with id: ${agent_deployment_link_id}, this is the ${AgentWebSocketManager.log_websocket_by_agent_deployment_id[agent_deployment_link_id].sockets.length} websocket to be stored`,
            );
            socket.onmessage = (msg) => {
                if (
                    !AgentWebSocketManager.log_websocket_by_agent_deployment_id[
                        agent_deployment_link_id
                    ]
                ) {
                    Logger.error(
                        `bug(WebSocketManager): Could not find log_websocket_by_agent_deployment_id entry in Websocket manager, although it is required in socket.onmessage id: ${agent_deployment_link_id}`,
                    );
                    return;
                }
                try {
                    const line_raw = JSON.parse(msg.data.toString());
                    const zod_schema = log_line_schema.safeParse(line_raw);
                    if (!zod_schema.success) {
                        throw new Error(`Could not validate zod schema: ${zod_schema}`);
                    }
                } catch (e) {
                    Logger.debug(
                        `Unable to validate zod schema, refusing to continue to serve line to other clients: ${e}`,
                    );
                    return;
                }
                for (const sock of AgentWebSocketManager.log_websocket_by_agent_deployment_id[
                    agent_deployment_link_id
                ].sockets) {
                    sock.send(msg.data.toString());
                }
                AgentWebSocketManager.log_websocket_by_agent_deployment_id[
                    agent_deployment_link_id
                ].log.push(msg.data.toString());
            };

            socket.onclose = () => {
                Logger.debug(
                    `Closing log websocket connection for agent_deployment_id: ${agent_deployment_link_id}`,
                );
            };
        }
    }

    /**
     * @description Finishes a deployment for a given agent_deployment_link_id by closing all websockets for that given id
     * @param {string} agent_deployment_link_id
     * @returns {Promise<void>}
     * */
    public static async finishDeployment(
        agent_deployment_link_id: string,
        status: "Pending" | "InProgress" | "Cancelled" | "Failed" | "Succeeded",
    ): Promise<void> {
        const agent_deployment_link_db = await new Agents_deployments_links().getById(
            agent_deployment_link_id,
        );
        if (!agent_deployment_link_db) {
            Logger.debug(
                `Received invalid closure request for link id: ${agent_deployment_link_id}`,
            );
            return;
        }

        // Set a 5 second timer to allow all cachix clients to still receive closing log messages
        setTimeout(async () => {
            if (
                !AgentWebSocketManager.log_websocket_by_agent_deployment_id[
                    agent_deployment_link_id
                ]
            ) {
                Logger.debug(
                    `Did not find any log websockets to clean up for id: ${agent_deployment_link_id}`,
                );
                return;
            }
            for (const sock of AgentWebSocketManager.log_websocket_by_agent_deployment_id[
                agent_deployment_link_id
            ].sockets) {
                sock.close(
                    1001,
                    JSON.stringify(
                        MakeRestResponse(1001, "Socket closing", false, {
                            msg: "This socket is closing due to: Deployment complete",
                        }),
                    ),
                );
            }

            // Close the deployment in the database
            await new Agents_deployments_links().update({
                ...agent_deployment_link_db,
                log: `[${AgentWebSocketManager.log_websocket_by_agent_deployment_id[agent_deployment_link_id].log.join(",")}]`,
                status: status,
            });
        }, 5000);
    }
}
