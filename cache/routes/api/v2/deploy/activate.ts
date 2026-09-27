import { Deployment_keys, Deployments } from "@iglu-sh/shared/db";
import { Logger } from "@iglu-sh/shared/logger";
import {
    deploy_json_schema,
    FilterFeatures,
    hashApiKey,
    IPFiltering,
    MakeRestResponse,
} from "@iglu-sh/shared/utils";
import type { Request, Response } from "express";
import bodyParser from "express";
import { z } from "zod";
import type { openapi_definiton } from "@/shared";
import { error_response_schema } from "@/shared/utils/zod/zod_rest_schemas";
import { AgentWebSocketManager } from "../../../../lib/WebSocketManager";

export const openapi: openapi_definiton = {
    meta: {
        path: "/api/v2/deploy/activate",
        authentication_required: false,
        feature_filtered: true,
        tags: ["api/v2/deploy", "cachix", "deploy"],
    },
    routes: [
        {
            method: "post",
            description: "Upload and activate a new deployment",
            summary: "Upload and activate a new deployment",
            request: {
                headers: z.object({
                    authorization: z.string(),
                }),
                body: {
                    description: "The deployment json you want to activate",
                    content: {
                        "application/json": {
                            schema: deploy_json_schema,
                        },
                    },
                },
            },
            responses: {
                200: {
                    description:
                        "Informational response containing the deployment id and the agents involved in the deployment",
                    content: {
                        "application/json": {
                            schema: z.object({
                                id: z.uuid(),
                                agents: z.record(
                                    z.string(),
                                    z.object({
                                        id: z.string(),
                                        url: z.url(),
                                    }),
                                ),
                            }),
                        },
                    },
                },
                401: {
                    description: "Returned if you are not allowed to activate deployments",
                    content: {
                        "application/json": {
                            schema: error_response_schema,
                        },
                    },
                },
                422: {
                    description:
                        "Returned if your deployment json wasn't in the right format (see cachix docs for more information)",
                    content: {
                        "application/json": {
                            schema: error_response_schema,
                        },
                    },
                },
            },
        },
    ],
};
export const post = [
    FilterFeatures("deployment"),
    IPFiltering(),
    bodyParser.json(),
    async (req: Request, res: Response) => {
        if (!req.headers.authorization) {
            Logger.debug(`Got invalid request to api/v2/deploy/activate`);
            return res.status(401).json(
                MakeRestResponse(401, "Forbidden", true, {
                    error_details: "You are not authorized to activate any deployments",
                }),
            );
        }

        const auth_token = req.headers.authorization.split(" ")[1];
        if (!auth_token) {
            Logger.debug(
                `Got invalid request to api/v2/deploy/activate (no auth token after split)`,
            );
            return res.status(401).json(
                MakeRestResponse(401, "Forbidden", true, {
                    error_details: "You are not authorized to activate any deployments",
                }),
            );
        }

        const deploy_key = await new Deployment_keys().getByHash(hashApiKey(auth_token));
        if (deploy_key === null || deploy_key.type !== "activate") {
            Logger.debug(`Got invalid request to api/v2/deploy/activate (no deployment key in db)`);
            return res.status(401).json(
                MakeRestResponse(401, "Forbidden", true, {
                    error_details: "You are not authorized to activate any deployments",
                }),
            );
        }
        const body_as_parsed = deploy_json_schema.safeParse(req.body);
        if (!body_as_parsed.success) {
            Logger.debug(
                `Got invalid request to api/v2/deploy/activate (Unable to parse body as parsed)`,
            );
            return res.status(422).json(
                MakeRestResponse(422, "Forbidden", true, {
                    error_details: "Your request json is malformed",
                }),
            );
        }

        const deployment = await new Deployments().insert({
            id: "n/a",
            tenants_id: deploy_key.tenants_id,
            deploy_json: JSON.stringify(req.body),
            created_at: 0,
            start_time: Date.now(),
            end_time: 0,
            status: "Pending",
            deployment_index:
                (await new Deployments().getIndexForTenantDeployment(deploy_key.tenants_id.id)) + 1,
            key_used: deploy_key,
        });

        const return_ids = await AgentWebSocketManager.emitBuildEvent(deployment);
        let out = {};
        Object.keys(return_ids).forEach((agent_id) => {
            if (!return_ids[agent_id]) {
                return;
            }
            out = {
                ...out,
                [return_ids[agent_id].agents_id.name]: {
                    id: return_ids[agent_id].id,
                    url: `${process.env.HOSTNAME}/api/v1/iglu/deployments/${return_ids[agent_id]?.id}/human_readable`,
                },
            };
        });
        return res.status(200).json({
            id: deployment.id,
            agents: out,
        });
    },
];
