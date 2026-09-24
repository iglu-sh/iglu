import type { openapi_definiton, tenant } from "@iglu-sh/shared";
import { Signing_Keys, Tenants } from "@iglu-sh/shared/db";
import { Logger } from "@iglu-sh/shared/logger";
import { Authentication, IPFiltering, MakeRestResponse } from "@iglu-sh/shared/utils";
import { error_response_schema } from "@iglu-sh/shared/utils/zod/zod_rest_schemas";
import bodyParser, { type Request, type Response } from "express";
import { z } from "zod";

/*
 * This endpoint accepts only GET requests from the Cachix Client
 * It is used to check authentication and check configuration for this tenant.
 *
 * Request type is in this schema:
 * headers: {
 *  accept: 'application/json;charset=utf-8,application/json',
 *  authorization: 'Bearer <key>',
 *  user-agent: 'cachix 1.11.0'
 * }
 *
 *
 * Response type is in this schema:
 * Type: Application/JSON
 * Schema:
 * {
 *  githubUsername: string,
 *  isPublic: boolean,
 *  name: string,
 *  permission: string,
 *  preferredCompressionMethod: string,
 *  publicSigningKeys: Array<string>,
 *  uri: string,
 *  priority: number
 * }
 * */

export const openapi: openapi_definiton = {
    meta: {
        path: "/api/v1/cache/{tenant}",
        authentication_required: true,
        feature_filtered: false,
        tags: ["api/v1/cache", "cachix"],
    },
    routes: [
        {
            method: "get",
            description: "Get a tenant by its id in the cachix format",
            summary: "Get a tenant in cachix format",
            request: {
                params: z.object({
                    tenant: z.string(),
                }),
            },
            responses: {
                200: {
                    description: "Cachix format with required information",
                    content: {
                        "application/json": {
                            schema: z.object({
                                githubUsername: z.string(),
                                isPublic: z.boolean(),
                                name: z.string(),
                                permission: z.string(),
                                preferredCompressionMethod: z.enum(["XZ", "ZSTD"]),
                                publicSigningKeys: z.string(),
                                uri: z.string(),
                                priority: z.string(),
                            }),
                        },
                    },
                },
                404: {
                    description: "Tenant does not exist on this server",
                    content: {
                        "application/json": {
                            schema: error_response_schema,
                        },
                    },
                },
                406: {
                    description:
                        "This error occured because the client does not have the user agent header set",
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
    Authentication(),
    bodyParser.json(),
    async (req: Request, res: Response) => {
        const TENANT_NAME = req.params.tenant;
        Logger.debug(`Attempting to find tenant`);
        if (!req.headers["user-agent"]) {
            return res.status(406).json(
                MakeRestResponse(406, "Forbidden - No User Agent", true, {
                    error_details:
                        "You do not have a user-agent header set, this ressource is not available without one",
                }),
            );
        }

        if (!TENANT_NAME || Array.isArray(TENANT_NAME)) {
            return res.status(404).json(
                MakeRestResponse(404, "Not found", true, {
                    error_details: "This tenant was not found on this sever.",
                }),
            );
        }

        // Fetch the tenant information
        const all_tenant_information = (await new Tenants().getByName(
            TENANT_NAME,
        )) as Array<tenant>;
        const tenant_information = all_tenant_information[0] as tenant;

        const signing_keys_for_tenant = await new Signing_Keys().getByTenant(tenant_information.id);
        const tenant_info = tenant_information;
        return res.status(200).json({
            githubUsername: tenant_info.github_username,
            isPublic: tenant_info.is_public,
            name: tenant_info.name,
            permission: tenant_info.permission,
            preferredCompressionMethod: tenant_info.preferred_compression_method.toUpperCase(),
            publicSigningKeys: signing_keys_for_tenant.map((x) => x.key),
            uri: tenant_info.uri,
            priority: tenant_info.priority,
        });
    },
];
