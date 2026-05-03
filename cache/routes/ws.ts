import type { Request } from "express";
import z from "zod";
import Logger from "@/logger";
import { Agents } from "../../shared/db/DAO/agents";
import Deployment_keys from "../../shared/db/DAO/deployment_keys";
import Signing_Keys from "../../shared/db/DAO/signing_keys";
import { hashApiKey } from "../../shared/utils/crypto/api_key_generation";
import MakeRestResponse from "../../shared/utils/rest/MakeResponse";
import { AgentWebSocketManager } from "../lib/WebSocketManager";

const expected_headers_schema = z.object({
    name: z.string(),
    authorization: z.string(),
    version: z.string(),
    system: z.string(),
});

export const ws = [
    async (socket: WebSocket, req: Request) => {
        Logger.logRequest("/ws", "WS");
        if (!req.headers.name || !req.headers.authorization) {
            Logger.debug(`Invalid connection attempt was made to /ws`);
            return socket.close(
                401,
                JSON.stringify(
                    MakeRestResponse(401, "Invalid Connection Headers", true, {
                        error_description:
                            "Your request is invalid due to: Not all headers were satisfied (authorization/name)",
                    }),
                ),
            );
        }

        const parsed_headers_schema = expected_headers_schema.safeParse(req.headers);
        if (!parsed_headers_schema.success) {
            Logger.debug(`Invalid connection to /ws: Invalid or non-existant token supplied`);
            return socket.close(
                401,
                JSON.stringify(
                    MakeRestResponse(401, "Authorization failed", true, {
                        error_description:
                            "Your request is invalid due to: Your auth token is invalid or does not exist",
                    }),
                ),
            );
        }
        const auth_token = parsed_headers_schema.data.authorization.split(" ")[1];
        if (!auth_token) {
            Logger.debug(`Invalid connection to /ws: Invalid or non-existant token supplied`);
            return socket.close(
                401,
                JSON.stringify(
                    MakeRestResponse(401, "Authorization failed", true, {
                        error_description:
                            "Your request is invalid due to: Your auth token is invalid or does not exist",
                    }),
                ),
            );
        }

        const deployment_key = await new Deployment_keys().getByHash(hashApiKey(auth_token));
        if (deployment_key === null || deployment_key.type !== "agent") {
            Logger.debug(`Invalid connection to /ws: Token not found in database`);
            return socket.close(
                401,
                JSON.stringify(
                    MakeRestResponse(401, "Authorization failed", true, {
                        error_description:
                            "Your request is invalid due to: Your auth token is invalid or does not exist",
                    }),
                ),
            );
        }

        // Search for the agent in the database, if it does not yet exist then we create it
        const agents_in_db = await new Agents().getByNameAndTenant(
            parsed_headers_schema.data.name,
            deployment_key.tenants_id.id,
        );

        if (agents_in_db.length === 0) {
            Logger.debug("Got new agent, inserting into database");
            try {
                const new_agent = await new Agents().insert({
                    id: "n/a",
                    last_seen: Date.now(),
                    version: parsed_headers_schema.data.version,
                    os: parsed_headers_schema.data.system,
                    is_online: true,
                    name: parsed_headers_schema.data.name,
                    tenants_id: deployment_key.tenants_id,
                    last_key_used: deployment_key,
                });
                agents_in_db.push(new_agent);
            } catch (e) {
                Logger.error(`Error whilst inserting into agents table: ${e}`);
                return socket.close(
                    500,
                    JSON.stringify(
                        MakeRestResponse(500, "Internal Server Error", true, {
                            error_description:
                                "Iglu cannot process this request at the moment, please try again later",
                        }),
                    ),
                );
            }
        }

        if (!agents_in_db[0]) {
            Logger.error(`BUG(cache::deploy::ws): Did not receive agent object from database`);
            return socket.close(
                500,
                JSON.stringify(
                    MakeRestResponse(500, "Internal Server Error", true, {
                        error_description:
                            "Iglu cannot process this request at the moment, please try again later",
                    }),
                ),
            );
        }

        // Now fetch all signing keys for the tenant this is referring to
        const signing_keys_for_tenant = await new Signing_Keys().getByTenant(
            deployment_key.tenants_id.id,
        );

        socket.send(
            JSON.stringify({
                agent: agents_in_db[0].id,
                command: {
                    contents: {
                        cache: {
                            cacheName: deployment_key.tenants_id.name,
                            isPublic: deployment_key.tenants_id.is_public,
                            publicKey: signing_keys_for_tenant
                                .map((element) => element.key)
                                .join(" "),
                        },
                        id: deployment_key.tenants_id.id,
                    },
                    tag: "AgentRegistered",
                },
                id: Bun.randomUUIDv7(),
                method: "AgentRegistered",
            }),
        );

        await AgentWebSocketManager.storeWebSocketForTenant(
            deployment_key.tenants_id.id,
            agents_in_db[0],
            socket,
        );
        /*
        socket.send(
            JSON.stringify({
                agent: agents_in_db[0].id,
                command: {
                    contents: {
                        cache: {
                            cacheName: deployment_key.tenants_id.name,
                            isPublic: deployment_key.tenants_id.is_public,
                            publicKey: signing_keys_for_tenant
                                .map((element) => element.key)
                                .join(" "),
                        },
                        id: deployment_key.tenants_id.id,
                    },
                    tag: "AgentRegistered",
                },
                id: Bun.randomUUIDv7(),
                method: "AgentRegistered",
            }),
        );
        */
        socket.onmessage = (msg) => {
            console.log("MSG Received:", msg.data.toString());
        };

        /*
        setTimeout(() => {
            socket.send(
                JSON.stringify({
                    agent: "3e25eb05-d855-431a-a656-c5f93bf877a2",
                    command: {
                        contents: {
                            id: "276fb0ea-b457-4f37-8516-5b30aa8f8581",
                            index: 4,
                            rollbackScript: null,
                            storePath: "/nix/store/something.nar",
                        },
                        tag: "Deployment",
                    },
                    id: "015fd327-5da9-4df6-8c63-79ff2222453c",
                    method: "Deployment",
                }),
            );
        }, 1000);
        */

        /*
        setTimeout(() => {
            socket.close()
        }, 2000)
        */
    },
];
