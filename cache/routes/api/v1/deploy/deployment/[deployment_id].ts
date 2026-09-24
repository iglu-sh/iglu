import { Agents_deployments_links, Deployment_keys } from "@iglu-sh/shared/db";
import {
    deploy_info_schema,
    FilterFeatures,
    hashApiKey,
    IPFiltering,
    MakeRestResponse,
} from "@iglu-sh/shared/utils";
import type { Request, Response } from "express";
import z from "zod";
import type { openapi_definiton } from "@/shared";
import { error_response_schema } from "@/shared/utils/zod/zod_rest_schemas";

const expected_header_schema = z.object({
    authorization: z.string(),
});

const expected_params_schema = z.object({
    deployment_id: z.string(),
});

export const openapi: openapi_definiton = {
    meta: {
        path: "/api/v1/deploy/deployment/{deployment_id}",
        authentication_required: false,
        feature_filtered: true,
        tags: ["api/v1/deploy", "cachix"],
    },
    routes: [
        {
            method: "get",
            description: "Get an overview of a given deployment (by deployment id)",
            summary: "Get deployment overview",
            request: {
                params: z.object({
                    deployment_id: z.string(),
                }),
                headers: z.object({
                    authorization: z.string(),
                }),
            },
            responses: {
                200: {
                    description: "Information about the deployment",
                    content: {
                        "application/json": {
                            schema: deploy_info_schema,
                        },
                    },
                },
                401: {
                    description: "Not authorized to view deployment",
                    content: {
                        "application/json": {
                            schema: error_response_schema,
                        },
                    },
                },
                404: {
                    description: "The deployment does not exist on the server",
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

export const get = [
    IPFiltering(),
    FilterFeatures("deployment"),
    async (req: Request, res: Response) => {
        const parsed_expected_header = expected_header_schema.safeParse(req.headers);
        const parsed_expected_params = expected_params_schema.safeParse(req.params);
        if (
            !parsed_expected_header.success ||
            !parsed_expected_params.success ||
            parsed_expected_header.data.authorization.split(" ").length !== 2 ||
            !parsed_expected_header.data.authorization.split(" ")[1]
        ) {
            return res.status(401).json(
                MakeRestResponse(401, "Unauthorized", true, {
                    error_details: "You are not permitted to view this deployment",
                }),
            );
        }

        const bearer_token = parsed_expected_header.data.authorization.split(" ")[1] as string;
        const token_in_db = await new Deployment_keys().getByHash(hashApiKey(bearer_token));
        if (token_in_db === null) {
            return res.status(401).json(
                MakeRestResponse(401, "Unauthorized", true, {
                    error_details: "You are not permitted to view this deployment",
                }),
            );
        }

        const deployment_in_db = await new Agents_deployments_links().getById(
            parsed_expected_params.data.deployment_id,
        );
        if (deployment_in_db === null) {
            return res.status(404).json(
                MakeRestResponse(404, "Not found", true, {
                    error_details: "The requested deployment cannot be found.",
                }),
            );
        }

        if (deployment_in_db.deployments_id.tenants_id.id !== token_in_db.tenants_id.id) {
            return res.status(401).json(
                MakeRestResponse(401, "Unauthorized", true, {
                    error_details: "You are not allowed to access this deployment!",
                }),
            );
        }

        const return_object = {
            closureSize: deployment_in_db.closure_size,
            createdOn: new Date(deployment_in_db.started_at).toISOString(),
            finishedOn:
                deployment_in_db.finished_at === null
                    ? null
                    : new Date(deployment_in_db.finished_at).toISOString(),
            id: deployment_in_db.id,
            index: 1,
            startedOn: new Date(deployment_in_db.started_at).toISOString(),
            status: deployment_in_db.status,
            storePath: deployment_in_db.store_path,
        };
        return res.status(200).json(return_object);
    },
];
