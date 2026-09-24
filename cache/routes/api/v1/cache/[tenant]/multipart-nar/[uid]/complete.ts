import {
    Derivation_tenant_link,
    Derivations,
    Requests,
    Signing_Keys,
    Tenants,
    Uploads,
} from "@iglu-sh/shared/db";
import { Filesystem } from "@iglu-sh/shared/files";
import { Logger } from "@iglu-sh/shared/logger";
import { Authentication, IPFiltering, MakeRestResponse } from "@iglu-sh/shared/utils";
import type { Request, Response } from "express";
import bodyParser from "express";
import z from "zod";
import type { openapi_definiton } from "@/shared";
import { error_response_schema } from "@/shared/utils/zod/zod_rest_schemas";

const body_schema = z.object({
    narInfoCreate: z.object({
        cDeriver: z.string(),
        cFileHash: z.string(),
        cFileSize: z.number(),
        cNarHash: z.string(),
        cNarSize: z.number(),
        cReferences: z.array(z.string()),
        cSig: z.string(),
        cStoreHash: z.string(),
        cStoreSuffix: z.string(),
    }),
    parts: z.array(
        z.object({
            eTag: z.string(),
            partNumber: z.number(),
        }),
    ),
});
const params_schema = z.object({
    tenant: z.string(),
    uid: z.string(),
});

export const openapi: openapi_definiton = {
    meta: {
        path: "/api/v1/cache/{tenant}/multipart-nar/{uid}/complete",
        authentication_required: true,
        tags: ["api/v1/cache", "cachix"],
        feature_filtered: false,
    },
    routes: [
        {
            method: "post",
            description:
                "Finish a given upload by uploading cachix meta information about the derivation",
            summary: "Finish a given upload",
            request: {
                params: z.object({
                    tenant: z.string(),
                    uid: z.string(),
                }),
                body: {
                    description: "Meta information about the derivation",
                    required: true,
                    content: {
                        "application/json": {
                            schema: body_schema,
                        },
                    },
                },
            },
            responses: {
                200: {
                    description: "Empty success response",
                    content: {},
                },
                400: {
                    description: "Returned if your body was not in the correct format",
                    content: {
                        "application/json": {
                            schema: error_response_schema,
                        },
                    },
                },
                408: {
                    description:
                        "Returned if the upload ID you were using is no longer valid (timed out)",
                    content: {
                        "application/json": {
                            schema: error_response_schema,
                        },
                    },
                },
                422: {
                    description: "The given upload ID was not found",
                    content: {
                        "application/json": {
                            schema: error_response_schema,
                        },
                    },
                },
                500: {
                    description: "Iglu encountered an error finishing the upload",
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
        const verified_params = params_schema.safeParse(req.params);
        const verified_body = body_schema.safeParse(req.body);
        if (!verified_body.success || !verified_params.success) {
            return res.status(400).json(
                MakeRestResponse(400, "Malformed Body", true, {
                    error_details: "The provided request body is not valid",
                }),
            );
        }
        const body = verified_body.data;
        const upload = await new Uploads().getById(verified_params.data.uid);
        if (upload === null) {
            return res.status(422).json(
                MakeRestResponse(422, "Not found", true, {
                    error_details: "The provided upload ID is either invalid or does not exist",
                }),
            );
        }

        if (upload.timeout < Date.now() / 1000) {
            await new Uploads().delete(upload);
            return res.status(408).json(
                MakeRestResponse(408, "Gone", true, {
                    error_details: "This Upload ID is no longer valid (timed out)",
                }),
            );
        }

        const signing_key = await new Signing_Keys().getByApiKeyId(upload.signed_by.id);
        if (signing_key === null) {
            return res.status(422).json(
                MakeRestResponse(422, "Not found", true, {
                    error_details: "The provided upload ID is either invalid or does not exist",
                }),
            );
        }
        const tenants = await new Tenants().getByName(verified_params.data.tenant);
        if (!tenants[0]) {
            return res.status(404).json(
                MakeRestResponse(404, "Not found", true, {
                    error_details: "This tenant does not exist",
                }),
            );
        }

        try {
            // Combine the files:
            await new Filesystem().combine(
                upload.tenants_id.id,
                upload.id,
                body.narInfoCreate.cFileHash,
                `${body.narInfoCreate.cStoreHash}-${body.narInfoCreate.cStoreSuffix}.${upload.compression}`,
                body.parts,
            );
        } catch (e) {
            Logger.debug(`Could not combine files: ${e}`);
            return res.status(500).json(
                MakeRestResponse(500, "Internal Server Error", true, {
                    error_details: "Iglu could not process this request, please try again later",
                }),
            );
        }

        try {
            const derivation = await new Derivations().insert({
                id: "n/a",
                cderiver: body.narInfoCreate.cDeriver,
                cfilehash: body.narInfoCreate.cFileHash,
                cfilesize: body.narInfoCreate.cFileSize,
                cnarhash: body.narInfoCreate.cNarHash,
                cnarsize: body.narInfoCreate.cNarSize.toString(),
                creferences: JSON.stringify(body.narInfoCreate.cReferences),
                csig: body.narInfoCreate.cSig,
                cstorehash: body.narInfoCreate.cStoreHash,
                cstoresuffix: body.narInfoCreate.cStoreSuffix,
                compression: upload.compression,
                signing_keys_id: signing_key,
                parts: JSON.stringify(body.parts),
            });

            const derivation_tenant_link = await new Derivation_tenant_link().insert({
                id: "n/a",
                derivations_id: derivation,
                tenants_id: tenants[0],
                pin: false,
            });

            await new Requests().insert({
                id: "n/a",
                derivations_tenants_links: derivation_tenant_link.id,
                direction: "inbound",
                date: Date.now(),
                url: `/api/v1/cache/${derivation_tenant_link.tenants_id.name}/multipart-nar/${upload.id}/complete`,
            });

            await new Uploads().delete(upload);
        } catch (e) {
            Logger.error(`Failed to create derivation: ${e}`);
            return res.status(500).json(
                MakeRestResponse(500, "Internal Server Error", true, {
                    error_details: "Iglu was not able to finish your upload. Please try again.",
                }),
            );
        }

        return res.status(200).send();
    },
];
