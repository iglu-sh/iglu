import { Api_keys } from "@iglu-sh/shared/db";
import { Logger } from "@iglu-sh/shared/logger";
import type { openapi_definiton } from "@iglu-sh/shared/types";
import { FilterFeatures, hashApiKey, MakeRestResponse } from "@iglu-sh/shared/utils";
import {
    base_response_schema,
    error_response_schema,
} from "@iglu-sh/shared/utils/zod/zod_rest_schemas";
import { escapeHTML } from "bun";
import { json, type Request, type Response } from "express";
import z from "zod";

const expected_header_schema = z.object({
    authorization: z.string(),
});
const expected_body_schema = z.object({
    name: z.string(),
});

export const openapi: openapi_definiton = {
    meta: {
        path: "/api/v1/iglu/rest/keys/auth/modify",
        authentication_required: false,
        feature_filtered: true,
        tags: ["api/v1/iglu/rest/keys", "iglu"],
    },
    routes: [
        {
            method: "patch",
            description:
                "Modify which API Keys are allowed to access tenants that you have access to",
            summary: "Modify API Key access",
            request: {
                headers: expected_header_schema,
                body: {
                    description: "New state that the tenant should reflect",
                    content: {
                        "application/json": {
                            schema: expected_body_schema,
                        },
                    },
                },
            },
            responses: {
                200: {
                    description: "Informational response on success of operation",
                    content: {
                        "application/json": {
                            schema: base_response_schema.extend(
                                z.object({
                                    is_error: z.literal(false),
                                    data: z.object({
                                        information: z.literal("Request completed successfully"),
                                    }),
                                }).shape,
                            ),
                        },
                    },
                },
                400: {
                    description: "The provided request body is not in the correct format",
                    content: {
                        "application/json": {
                            schema: error_response_schema,
                        },
                    },
                },
                401: {
                    description:
                        "The API Key you used is not recognized OR you are not allowed to edit the tenants you provided",
                    content: {
                        "application/json": {
                            schema: error_response_schema,
                        },
                    },
                },
                500: {
                    description: "Iglu was unable to complete the request",
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

export const patch = [
    FilterFeatures("rest"),
    json(),
    async (req: Request, res: Response) => {
        const parsed_headers = expected_header_schema.safeParse(req.headers);
        if (!parsed_headers.success || !parsed_headers.data.authorization.split(" ")[1]) {
            return res.status(403).json(
                MakeRestResponse(403, "Access Forbidden", true, {
                    error_details:
                        "You are not allowed to access this cache (no auth header presented)",
                }),
            );
        }

        const parsed_body = expected_body_schema.safeParse(req.body);
        if (!parsed_body.success) {
            return res.status(400).json(
                MakeRestResponse(400, "Malformed Request Body", true, {
                    error_details: "Your request body was malformed!",
                }),
            );
        }

        const api_key = await new Api_keys().getByHash(
            hashApiKey(parsed_headers.data.authorization.split(" ")[1] as string),
        );
        if (api_key === null) {
            return res.status(401).json(
                MakeRestResponse(401, "Unauthorized", true, {
                    error_details:
                        "You are not allowed to access this tenant (API Key not recognized)",
                }),
            );
        }

        try {
            await new Api_keys().update({
                ...api_key,
                name: escapeHTML(parsed_body.data.name),
            });
        } catch (err) {
            Logger.warn(`Unable to update api key: ${err}`);
            return res.status(500).json(
                MakeRestResponse(500, "Internal Server Error", true, {
                    error_details: "Iglu was unable to handle this request, please try again",
                }),
            );
        }

        return res.status(200).json(
            MakeRestResponse(200, "Success", false, {
                ...api_key,
                name: escapeHTML(parsed_body.data.name),
            }),
        );
    },
];
