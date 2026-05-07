import z from "zod";
import Logger from "@/logger";
import { Agents_deployments_links } from "../../shared/db/DAO/agents_deployments_links";

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

export const ws = [
    async (socket: WebSocket) => {
        Logger.debug(`Deployment websocket connected`);

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

                await new Agents_deployments_links().update({
                    ...link,
                    status: message_as_json.command.hasSucceeded ? "Succeeded" : "Failed",
                });
            }
        };

        socket.onclose = () => {
            Logger.debug(`Closing deployment websocket`);
        };
    },
];
