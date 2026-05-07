import type { Request, Response } from "express";
import bodyParser from "express";
import Logger from "@/logger";
import { Deployments } from "../../../../../shared/db/DAO/deployment";
import Deployment_keys from "../../../../../shared/db/DAO/deployment_keys";
import { hashApiKey } from "../../../../../shared/utils/crypto/api_key_generation";
import IPFiltering from "../../../../../shared/utils/rest/IPFiltering";
import MakeRestResponse from "../../../../../shared/utils/rest/MakeResponse";
import { deploy_json_schema } from "../../../../../shared/utils/zod/zod_cachix_schemas";
import { AgentWebSocketManager } from "../../../../lib/WebSocketManager";
export const post = [
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
            Logger.debug(`Got invalid request to api/v2/deploy/activate (no deployment key in db)`);
            return res.status(401).json(
                MakeRestResponse(401, "Forbidden", true, {
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
                    url: `${process.env.HOSTNAME}/api/v1/iglu/deployments/${return_ids[agent_id]?.id}/hr`,
                },
            };
        });
        return res.status(200).json({
            id: deployment.id,
            agents: out,
        });
    },
];
