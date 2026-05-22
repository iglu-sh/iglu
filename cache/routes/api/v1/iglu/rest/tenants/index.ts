import type { tenant } from "@iglu-sh/shared";
import { Api_keys, Api_keys_tenants_link, Tenants } from "@iglu-sh/shared/db";
import { Logger } from "@iglu-sh/shared/logger";
import {
    Authentication,
    FilterFeatures,
    hashApiKey,
    MakeRestResponse,
    tenant_schema,
} from "@iglu-sh/shared/utils";
import { Configuration } from "@iglu-sh/shared/utils/cache";
import type { Request, Response } from "express";
import bodyParser from "express";
import z from "zod";

const expected_header_schema = z.object({
    authorization: z.string(),
    "user-agent": z.string(),
});

export const post = [
    FilterFeatures("rest"),
    Authentication(),
    bodyParser.json(),
    async (req: Request, res: Response) => {
        const headers = expected_header_schema.safeParse(req.headers);
        if (!headers.success) {
            return res.status(403).json(
                MakeRestResponse(403, "Malformed Header", true, {
                    error_details:
                        "You request does not provide all headers that are required to access this endpoint.",
                }),
            );
        }

        const body = tenant_schema.safeParse(req.body);
        if (!body.success) {
            return res.status(422).json(
                MakeRestResponse(422, "Malformed Body", true, {
                    error_details:
                        "Your request body does not adhere to the tenant schema, please correct your error and try again.",
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

        const tenants_with_same_name = await new Tenants().getByName(body.data.name);
        if (tenants_with_same_name.length > 0) {
            return res.status(409).json(
                MakeRestResponse(409, "Conflict", true, {
                    error_details: "The tenant name requested is already in use. Try another name.",
                }),
            );
        }

        // Create the tenant
        let created_tenant: tenant | undefined;
        try {
            const tenant = await new Tenants().insert({
                ...body.data,
                uri: `${Configuration.getConfig().server.hostname}/${body.data.name}`,
                id: "n/a",
            });
            created_tenant = tenant;
            await new Api_keys_tenants_link().insert({
                id: "n/a",
                tenants_id: tenant,
                api_keys_id: api_key,
            });
            return res.status(201).json(MakeRestResponse(201, "Created", false, tenant));
        } catch (e) {
            Logger.error(`Unable to insert tenant: ${e}`);
            if (created_tenant) {
                try {
                    await new Tenants().delete(created_tenant);
                } catch (e) {
                    Logger.error(
                        `Unable to clean tenant with id (may need manual cleanup): ${created_tenant.id}: ${e}`,
                    );
                }
            }
            return res.status(500).json(
                MakeRestResponse(500, "Internal Server Error", true, {
                    error_details: "Iglu was unable to handle your request, please try again later",
                }),
            );
        }
    },
];
