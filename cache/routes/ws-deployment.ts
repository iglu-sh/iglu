import type { Request } from "express";
import z from "zod";
import { Logger } from "@iglu-sh/shared/logger";
import { Deployment_keys, Agents_deployments_links } from "@iglu-sh/shared/db";
import { MakeRestResponse, FilterFeaturesWebSocket, hashApiKey } from "@iglu-sh/shared/utils";
import { AgentWebSocketManager } from "../lib/WebSocketManager";

const message_schema = z.object({
    agent: z.string(),
    command: z.union([
        z.object({
            closureSize: z.number().nullable(),
            id: z.string(),
            tag: z.string(),
            time: z.iso.datetime(),
        }),
        z.object({
            hasSucceeded: z.boolean(),
            id: z.string(),
            tag: z.string(),
            time: z.iso.datetime(),
        }),
    ]),
    id: z.string(),
    method: z.string(),
});

const expected_header_schema = z.object({
    authorization: z.string(),
});

export const ws = [
    async (socket: WebSocket, req: Request) => {
        Logger.debug(`Deployment websocket connected`);

        if (FilterFeaturesWebSocket("deployment")) {
            return socket.close(
                1003,
                JSON.stringify(
                    MakeRestResponse(503, "Feature not enabled", true, {
                        error_description:
                            "This feature is not enabled. Enable it by setting enable_deployments = true in your config.toml",
                    }),
                ),
            );
        }

        const parsed_headers = expected_header_schema.safeParse(req.headers);
        if (!parsed_headers.success || !parsed_headers.data.authorization.split(" ")[1]) {
            return socket.close(
                1003,
                JSON.stringify(
                    MakeRestResponse(401, "Unauthorized", true, {
                        error_description: "You are not permitted to connect to this endpoint",
                    }),
                ),
            );
        }

        const key = parsed_headers.data.authorization.split(" ")[1] as string;

        const key_in_database = await new Deployment_keys().getByHash(hashApiKey(key));

        if (key_in_database === null) {
            return socket.close(
                1003,
                JSON.stringify(
                    MakeRestResponse(401, "Unauthorized", true, {
                        error_description: "You are not permitted to connect to this endpoint",
                    }),
                ),
            );
        }

        socket.onmessage = async (msg) => {
            let message_as_json:
                | {
                      agent: string;
                      command: {
                          closureSize?: number | null;
                          hasSucceeded?: boolean;
                          id: string;
                          tag: string;
                          time: string;
                      };
                      id: string;
                      method: string;
                  }
                | undefined;

            try {
                const parsed = JSON.parse(msg.data.toString());
                const as_schema = message_schema.safeParse(parsed);
                if (!as_schema.success) {
                    throw new Error(
                        `Could not safely determine schema of deployment websocket message: ${JSON.stringify(as_schema)}`,
                    );
                }
                message_as_json = as_schema.data;
            } catch (e) {
                Logger.debug(`Unable to validate deployment websocket schema: ${e}`);
            }

            if (!message_as_json) {
                return;
            }

            if (message_as_json.method === "DeploymentStarted") {
                // Fetch the agent_deployment_link
                const link = await new Agents_deployments_links().getById(
                    message_as_json.command.id,
                );
                if (!link) {
                    Logger.debug(
                        `Got invalid connection to deployment ws: No agent deployment link defined with given ID`,
                    );
                    socket.close();
                    return;
                }

                await new Agents_deployments_links().update({
                    ...link,
                    status: "InProgress",
                });
            }

            if (message_as_json.method === "DeploymentFinished") {
                const link = await new Agents_deployments_links().getById(
                    message_as_json.command.id,
                );
                if (!link) {
                    Logger.debug(
                        `Got invalid connection to deployment ws: No agent deployment link defined with given ID`,
                    );
                    socket.close();
                    return;
                }
                Logger.debug(
                    `Closing deployment: ${link.id} with status ${message_as_json.command.hasSucceeded ? "Succeeded" : "Failed"}`,
                );

                AgentWebSocketManager.finishDeployment(
                    link.id,
                    message_as_json.command.hasSucceeded ? "Succeeded" : "Failed",
                );
            }
        };

        socket.onclose = () => {
            Logger.debug(`Closing deployment websocket`);
        };
    },
];
