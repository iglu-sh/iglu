import { Api_keys, Api_keys_tenants_link, Tenants } from "@iglu-sh/shared/db";
import {
    Authentication,
    FilterFeatures,
    hashApiKey,
    IPFiltering,
    MakeRestResponse,
} from "@iglu-sh/shared/utils";
import type { Request, Response } from "express";
import z from "zod";

const expected_header_schema = z.object({
    authorization: z.string(),
});
const expected_route_schema = z.object({
    tenant: z.string(),
});

export const get = [
    FilterFeatures("rest"),
    Authentication(),
    IPFiltering(),
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
        const parsed_route_schema = expected_route_schema.safeParse(req.params);
        if (!parsed_route_schema.success) {
            return res.status(404).json(
                MakeRestResponse(404, "Not found", true, {
                    error_details: "This tenant does not exist.",
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

        const tenants = await new Tenants().getByName(parsed_route_schema.data.tenant);
        if (!tenants[0]) {
            return res.status(404).json(
                MakeRestResponse(404, "Not found", true, {
                    error_details: "This tenant does not exist.",
                }),
            );
        }

        const api_keys_by_tenant = await new Api_keys_tenants_link().getByTenant(tenants[0].id);
        return res.status(200).json(
            MakeRestResponse(
                200,
                "Found",
                false,
                api_keys_by_tenant.map((x) => {
                    return {
                        ...x,
                        api_keys_id: {
                            ...x.api_keys_id,
                            hash: "<ommited>",
                        },
                    };
                }),
            ),
        );
    },
];
