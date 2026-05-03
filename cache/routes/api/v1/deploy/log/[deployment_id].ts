import type { Request } from "express";
import z from "zod";
import { Agents_deployments_links } from "../../../../../../shared/db/DAO/agents_deployments_links";
import MakeRestResponse from "../../../../../../shared/utils/rest/MakeResponse";
import { AgentWebSocketManager } from "../../../../../lib/WebSocketManager";

const params_zod_schema = z.object({
    deployment_id: z.string(),
});
export const ws = [
    async (socket: WebSocket, req: Request) => {
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
