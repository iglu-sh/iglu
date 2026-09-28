import { Api_keys, Api_keys_tenants_link } from "@iglu-sh/shared/db";
import {
    Authentication,
    FilterFeatures,
    hashApiKey,
    MakeRestResponse,
    tenant_schema,
} from "@iglu-sh/shared/utils";
import type { Request, Response } from "express";
import z from "zod";
import type { openapi_definiton } from "@/shared";
import { base_response_schema, error_response_schema } from "@/shared/utils/zod/zod_rest_schemas";

const expected_header_schema = z.object({
    authorization: z.string(),
    "user-agent": z.string(),
});

const expected_query_schema = z.object({
    query: z.string(),
});

export const openapi: openapi_definiton = {
    meta: {
        path: "/api/v1/iglu/rest/tenants/search",
        authentication_required: false,
        feature_filtered: true,
        tags: ["api/v1/iglu/rest/tenants", "iglu"],
    },
    routes: [
        {
            method: "get",
            description: "Search through all tenants that you have access too",
            summary: "Search for tenants",
            request: {
                query: expected_query_schema,
                headers: expected_header_schema,
            },
            responses: {
                200: {
                    description: "Success response containing the tenants you were looking for",
                    content: {
                        "application/json": {
                            schema: base_response_schema.extend(
                                z.object({
                                    is_error: z.literal(false),
                                    data: z.array(tenant_schema),
                                }).shape,
                            ),
                        },
                    },
                },
                400: {
                    description: "Returned if you did not provide the ?query= param",
                    content: {
                        "application/json": {
                            schema: error_response_schema,
                        },
                    },
                },
                401: {
                    description:
                        "Returned if either your auth header was malformed OR the api key provided does not exist",
                    content: {
                        "application/json": {
                            schema: error_response_schema,
                        },
                    },
                },
                403: {
                    description: "Returned if you did not provide an auth header",
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
    FilterFeatures("rest"),
    Authentication(),
    async (req: Request, res: Response) => {
        const headers = expected_header_schema.safeParse(req.headers);
        const query = expected_query_schema.safeParse(req.query);
        if (!headers.success) {
            return res.status(403).json(
                MakeRestResponse(403, "Malformed Header", true, {
                    error_details:
                        "You request does not provide all headers that are required to access this endpoint.",
                }),
            );
        }

        if (!query.success) {
            return res.status(400).json(
                MakeRestResponse(400, "No Query made", true, {
                    error_details: "You have not provided the ?query= param",
                }),
            );
        }

        const api_key_raw = headers.data.authorization.split(" ")[1];
        if (!api_key_raw) {
            return res.status(401).json(
                MakeRestResponse(401, "No API Key found", true, {
                    error_details: "Your auth header is malformed.",
                }),
            );
        }

        const api_key = await new Api_keys().getByHash(hashApiKey(api_key_raw));
        if (api_key === null) {
            return res.status(401).json(
                MakeRestResponse(401, "No API Key found", true, {
                    error_details: "This API key does not exist.",
                }),
            );
        }

        const tenants_by_api_key = await new Api_keys_tenants_link().getByApiKey(api_key.id);
        const return_array = [];
        for (const link of tenants_by_api_key) {
            if (link.tenants_id.name.toLowerCase().includes(query.data.query.toLowerCase())) {
                return_array.push(link.tenants_id);
            }
        }

        return res.status(200).json(MakeRestResponse(200, "Success", false, return_array));
    },
];
