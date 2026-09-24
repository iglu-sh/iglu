import { Api_keys, Signing_Keys, Tenants, Uploads } from "@iglu-sh/shared/db";
import { Logger } from "@iglu-sh/shared/logger";
import type { openapi_definiton, upload } from "@iglu-sh/shared/types";
import { Authentication, hashApiKey, IPFiltering, MakeRestResponse } from "@iglu-sh/shared/utils";
import type { Request, Response } from "express";
import bodyParser from "express";
import { z } from "zod";
import { error_response_schema } from "@/shared/utils/zod/zod_rest_schemas";

export const openapi: openapi_definiton = {
    meta: {
        path: "/api/v1/cache/{tenant}/multipart-nar",
        authentication_required: true,
        tags: ["api/v1/cache", "cachix"],
    },
    routes: [
        {
            method: "post",
            description:
                "Retrieves a new upload id for a multipart nar upload. (Used in Cachix upload flow)",
            summary: "Retrieve new upload ID",
            request: {
                params: z.object({
                    tenant: z.string(),
                }),
                headers: z.object({
                    "content-type": z.string(),
                }),
                query: z.object({
                    compression: z.enum(["xz", "zst"]),
                }),
            },
            responses: {
                200: {
                    description: "Generated Upload and NarIDs when request completed successfully",
                    content: {
                        "application/json": {
                            schema: z.object({
                                uploadId: z.string(),
                                narId: z.string(),
                            }),
                        },
                    },
                },
                400: {
                    description:
                        "Returned when you have provided invalid or missing query parameters (i.e if you are missing the compression parameter)",
                    content: {
                        "application/json": {
                            schema: error_response_schema,
                        },
                    },
                },
                404: {
                    description: "Returned when tenant is not found on this server",
                    content: {
                        "application/json": {
                            schema: error_response_schema,
                        },
                    },
                },
                412: {
                    description:
                        "Returned when there is no signing key associated with your API Key",
                    content: {
                        "application/json": {
                            schema: error_response_schema,
                        },
                    },
                },
                500: {
                    description:
                        "Returned when iglu encounters a request while trying to generate the IDs",
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
    IPFiltering(),
    Authentication(),
    bodyParser.json(),
    async (req: Request, res: Response) => {
        const TENANT_NAME = req.params.tenant;
        const COMPRESSION = req.query.compression;

        if (!TENANT_NAME || Array.isArray(TENANT_NAME)) {
            return res.status(404).json(
                MakeRestResponse(404, "Not found", true, {
                    error_details: "The requested Tenant was not found on this server",
                }),
            );
        }

        if (
            !COMPRESSION ||
            Array.isArray(COMPRESSION) ||
            typeof COMPRESSION !== "string" ||
            !["zst", "xz"].includes(COMPRESSION)
        ) {
            return res.status(400).json(
                MakeRestResponse(400, "Invalid Compression Parameter", true, {
                    error_details:
                        "Your requested compression is unavailable or you have not provided any param of that name",
                }),
            );
        }

        // Check if there's a signing key associated with the API key that is trying to upload
        if (!req.headers.authorization) {
            return res.status(403).json(
                MakeRestResponse(403, "Forbidden - No autorization", true, {
                    error_details:
                        "You do not have a authorization header set, or your Header is not in the Bearer format. This ressource is not available without one",
                }),
            );
        }

        const auth_header = req.headers.authorization.split(" ")[1];
        if (!auth_header) {
            return res.status(401).json(
                MakeRestResponse(401, "Unauthorized", true, {
                    error_details: "This key is not recognized",
                }),
            );
        }

        const api_key = await new Api_keys().getByHash(hashApiKey(auth_header));
        if (api_key === null) {
            return res.status(401).json(
                MakeRestResponse(401, "Unauthorized", true, {
                    error_details: "This key is not recognized",
                }),
            );
        }

        const signing_key_associated_with_api_key = await new Signing_Keys().getByApiKeyId(
            api_key.id,
        );
        if (signing_key_associated_with_api_key === null) {
            return res.status(412).json(
                MakeRestResponse(412, "No Signing Key", true, {
                    error_details:
                        "The API Key you are using does not have a signing key associated with it",
                }),
            );
        }
        // Get the tenant we are referring to
        const tenant = await new Tenants().getByName(TENANT_NAME);
        if (!tenant[0] || tenant.length !== 1) {
            return res.status(404).json(
                MakeRestResponse(404, "Not found", true, {
                    error_details: "This tenant wasn't found on this server",
                }),
            );
        }

        const compression_in_upload = COMPRESSION === "xz" ? "xz" : "zstd";
        // Insert a new upload into the uploads table
        let upload_element: upload;
        try {
            upload_element = await new Uploads().insert({
                id: "n/a",
                tenants_id: tenant[0],
                signed_by: api_key,
                md5: "<none>",
                compression: compression_in_upload,
                timeout: 0,
                s3_id: null,
            });
        } catch (e) {
            Logger.error(`Could not create upload: ${e}`);
            return res.status(500).json(
                MakeRestResponse(500, "Internal Server Error", true, {
                    error_details: "Iglu wasn't able to handle this request. Try again later!",
                }),
            );
        }
        Logger.debug(`Replying with uploadId: ${upload_element.id}`);

        return res.status(200).json({
            uploadId: upload_element.id,
            narId: upload_element.id,
        });
    },
];
