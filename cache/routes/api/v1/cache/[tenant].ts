import { Signing_Keys, Tenants } from "@iglu-sh/shared/db";
import { Logger } from "@iglu-sh/shared/logger";
import { Authentication, IPFiltering, MakeRestResponse } from "@iglu-sh/shared/utils";
import bodyParser, { type Request, type Response } from "express";
import type { tenant } from "@/db_types";

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

export const get = [
    IPFiltering(),
    Authentication(),
    bodyParser.json(),
    async (req: Request, res: Response) => {
        const TENANT_NAME = req.params.tenant;
        Logger.debug(`Attempting to find tenant`);
        if (!req.headers["user-agent"]) {
            return res.status(403).json(
                MakeRestResponse(403, "Forbidden - No User Agent", true, {
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
