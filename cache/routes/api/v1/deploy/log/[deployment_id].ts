import { Agents_deployments_links, Deployment_keys } from "@iglu-sh/shared/db";
import { FilterFeaturesWebSocket, hashApiKey, MakeRestResponse } from "@iglu-sh/shared/utils";
import type { Request } from "express";
import z from "zod";
import { AgentWebSocketManager } from "../../../../../lib/WebSocketManager";

const params_zod_schema = z.object({
    deployment_id: z.string(),
});

const expected_headers_schema = z.object({
    authorization: z.string(),
});
export const ws = [
    async (socket: WebSocket, req: Request) => {
        if (FilterFeaturesWebSocket("deployment")) {
            return socket.close(
                1003,
                JSON.stringify(
                    MakeRestResponse(401, "Feature not enabled", true, {
                        error_description:
                            "This feature is not enabled. Enable it by setting enable_deployments = true in your config.toml",
                    }),
                ),
            );
        }

        const parsed_headers = expected_headers_schema.safeParse(req.headers);
        if (!parsed_headers.success || !parsed_headers.data.authorization.split(" ")[1]) {
            return socket.close(
                1003,
                JSON.stringify(
                    MakeRestResponse(401, "Unauthorized", true, {
                        error_details: "You are not permitted to connect to this websocket",
                    }),
                ),
            );
        }

        const key = parsed_headers.data.authorization.split(" ")[1] as string;
        const deployment_key_db = await new Deployment_keys().getByHash(hashApiKey(key));
        if (deployment_key_db === null) {
            return socket.close(
                1003,
                JSON.stringify(
                    MakeRestResponse(401, "Unauthorized", true, {
                        error_details: "You are not permitted to connect to this websocket",
                    }),
                ),
            );
        }

        const parsed_params = params_zod_schema.safeParse(req.params);
        if (!parsed_params.success) {
            return socket.close(
                1003,
                JSON.stringify(
                    MakeRestResponse(404, "Not found", true, {
                        error_details: "This deployment does not exist",
                    }),
                ),
            );
        }

        const agent_deployment_link = await new Agents_deployments_links().getById(
            parsed_params.data.deployment_id,
        );

        if (!agent_deployment_link) {
            return socket.close(
                1003,
                JSON.stringify(
                    MakeRestResponse(404, "Not found", true, {
                        error_details: "This deployment does not exist",
                    }),
                ),
            );
        }

        await AgentWebSocketManager.storeLogSocket(agent_deployment_link.id, socket);
    },
];
