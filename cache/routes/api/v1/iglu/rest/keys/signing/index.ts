import type { openapi_definiton } from "@iglu-sh/shared";
import { Api_keys, Signing_Keys } from "@iglu-sh/shared/db";
import {
    FilterFeatures,
    hashApiKey,
    MakeRestResponse,
    signing_keys_schema,
} from "@iglu-sh/shared/utils";
import type { Request, Response } from "express";
import z from "zod";
import { base_response_schema, error_response_schema } from "@/shared/utils/zod/zod_rest_schemas";

const expected_header_schema = z.object({
    authorization: z.string(),
});

export const openapi: openapi_definiton = {
    meta: {
        path: "/api/v1/iglu/rest/keys/signing",
        authentication_required: false,
        feature_filtered: true,
        tags: ["api/v1/iglu/rest/keys", "iglu"],
    },
    routes: [
        {
            method: "get",
            description: "Get the signing key your API Key is associated with",
            summary: "Get Signing Key information",
            request: {
                headers: expected_header_schema,
            },
            responses: {
                200: {
                    description: "Signing key Information",
                    content: {
                        "application/json": {
                            schema: base_response_schema.extend(
                                z.object({
                                    is_error: z.literal(false),
                                    data: signing_keys_schema,
                                }).shape,
                            ),
                        },
                    },
                },
                401: {
                    description: "The API Key you were using does not exist",
                    content: {
                        "application/json": {
                            schema: error_response_schema,
                        },
                    },
                },
                403: {
                    description: "You did not present an authorization header",
                    content: {
                        "application/json": {
                            schema: error_response_schema,
                        },
                    },
                },
                404: {
                    description:
                        "Your API Key did not have a Public Signing Key associated with it",
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

        const signing_key_for_api_key = await new Signing_Keys().getByApiKeyId(api_key.id);
        if (signing_key_for_api_key === null) {
            return res.status(404).json(
                MakeRestResponse(404, "Not found", true, {
                    error_details:
                        "Your API Key does not have a signing key associated with it. Try uploading one using cachix generate-key <tenant_name>",
                }),
            );
        }

        return res.status(200).json(
            MakeRestResponse(200, "Found", false, {
                ...signing_key_for_api_key,
                api_keys_id: {
                    ...signing_key_for_api_key.api_keys_id,
                    hash: "<omitted>",
                },
            }),
        );
    },
];
