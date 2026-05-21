import { Api_keys, Api_keys_tenants_link } from "@iglu-sh/shared/db";
import { Logger } from "@iglu-sh/shared/logger";
import type { tenant } from "@iglu-sh/shared/types";
import { FilterFeatures, hashApiKey, MakeRestResponse } from "@iglu-sh/shared/utils";
import { json, type Request, type Response } from "express";
import z from "zod";

const expected_header_schema = z.object({
    authorization: z.string(),
});
const expected_body_schema = z.object({
    name: z.string(),
    tenants: z.array(z.uuid()),
});

export const post = [
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

        const tenants_for_api_key = await new Api_keys_tenants_link().getByApiKey(api_key.id);
        const tenants_ids = tenants_for_api_key.map((element) => element.tenants_id.id);
        const tenant_list: Array<tenant> = [];
        for (const requested_tenant of parsed_body.data.tenants) {
            const tenant_obj = tenants_for_api_key.filter(
                (x) => x.tenants_id.id === requested_tenant,
            )[0]?.tenants_id;
            if (!tenants_ids.includes(requested_tenant) || !tenant_obj) {
                return res.status(401).json(
                    MakeRestResponse(401, "Unauthorized", true, {
                        error_details:
                            "You are not allowed to edit some of the caches you requested in your requested tenants key.",
                    }),
                );
            }
            tenant_list.push(tenant_obj);
        }

        try {
            const new_key_plain = Bun.randomUUIDv7();
            const new_api_key = await new Api_keys().insert({
                id: "n/a",
                name: parsed_body.data.name,
                hash: hashApiKey(new_key_plain),
            });
            for (const requested_tenant of tenant_list) {
                await new Api_keys_tenants_link().insert({
                    id: "n/a",
                    api_keys_id: new_api_key,
                    tenants_id: requested_tenant,
                });
            }
            return res.status(200).json(
                MakeRestResponse(201, "Created", false, {
                    id: new_api_key.id,
                    name: new_api_key.name,
                    key: new_key_plain,
                }),
            );
        } catch (e) {
            Logger.debug(`Unable to create new Api key: ${e}`);
            return res.status(500).json(
                MakeRestResponse(500, "Internal Server Error", true, {
                    error_details: "Iglu was unable to handle your request. Please try again.",
                }),
            );
        }
    },
];

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

        const tenants_for_api_key = await new Api_keys_tenants_link().getByApiKey(api_key.id);
        return res.status(200).json(
            MakeRestResponse(200, "Found", false, {
                id: api_key.id,
                name: api_key.name,
                tenants: tenants_for_api_key.map((x) => x.tenants_id),
            }),
        );
    },
];

/*
 * For now, we'll only allow that an api key deletes itself, we'll need to figure something out for cleaning up abandoned API keys later
 * */
export const del = [
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

        try {
            await new Api_keys().delete(api_key);
            return res.status(200).json(
                MakeRestResponse(200, "Success", false, {
                    information: "This API Key has been deleted.",
                }),
            );
        } catch (e) {
            Logger.debug(`Unable to delete API Key: ${api_key.id} error: ${e}`);
        }
    },
];
