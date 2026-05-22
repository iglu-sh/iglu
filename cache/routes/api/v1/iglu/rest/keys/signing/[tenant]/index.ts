import { Api_keys, Signing_Keys, Tenants } from "@iglu-sh/shared/db";
import {
    Authentication,
    FilterFeatures,
    hashApiKey,
    IPFiltering,
    MakeRestResponse,
} from "@iglu-sh/shared/utils";
import type { Request, Response } from "express";
import { json } from "express";
import z from "zod";
import { Logger } from "@/shared/logger";

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

        const signing_keys_for_tenant = await new Signing_Keys().getByTenant(tenants[0].id);
        return res.status(200).json(
            MakeRestResponse(
                200,
                "Found",
                false,
                signing_keys_for_tenant.map((x) => {
                    return {
                        ...x,
                        api_keys_id: {
                            ...x.api_keys_id,
                            hash: "<omitted>",
                        },
                    };
                }),
            ),
        );
    },
];

const expected_body_schema = z.object({
    id: z.uuid(),
    name: z.string(),
});
export const patch = [
    FilterFeatures("rest"),
    Authentication(),
    IPFiltering(),
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
        const parsed_route_schema = expected_route_schema.safeParse(req.params);
        if (!parsed_route_schema.success) {
            return res.status(404).json(
                MakeRestResponse(404, "Not found", true, {
                    error_details: "This tenant does not exist.",
                }),
            );
        }
        const parsed_body = expected_body_schema.safeParse(req.body);
        if (!parsed_body.success) {
            return res.status(422).json(
                MakeRestResponse(422, "Unprocessable Content", true, {
                    error_details: "Your request body does not adhere to the accepted schema.",
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

        const signing_key = await new Signing_Keys().getById(parsed_body.data.id);
        if (signing_key === null || parsed_body.data.id === signing_key.api_keys_id.id) {
            return res.status(403).json(
                MakeRestResponse(403, "Access Forbidden", true, {
                    error_details: "You are not allowed to edit this public key.",
                }),
            );
        }

        try {
            const updated_key = await new Signing_Keys().update({
                ...signing_key,
                name: parsed_body.data.name,
            });
            return res.status(200).json(
                MakeRestResponse(200, "Success", false, {
                    ...updated_key,
                    api_keys_id: {
                        ...updated_key.api_keys_id,
                        hash: "<omitted>",
                    },
                }),
            );
        } catch (e) {
            Logger.debug(`Unable to update signing key: ${e}`);
            return res.status(500).json(
                MakeRestResponse(500, "Internal Server Error", true, {
                    error_details: "Iglu was unable to handle your request, please try again.",
                }),
            );
        }
    },
];

export const del = [
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

        const signing_key = await new Signing_Keys().getByApiKeyId(api_key.id);
        if (signing_key === null) {
            return res.status(403).json(
                MakeRestResponse(403, "Access Forbidden", true, {
                    error_details: "You are not allowed to edit this public key.",
                }),
            );
        }

        try {
            await new Signing_Keys().delete(signing_key);
            return res.status(201).json(
                MakeRestResponse(201, "Success", false, {
                    information: "Signing key deleted successfully",
                }),
            );
        } catch (e) {
            Logger.debug(`Unable to delete signing key: ${e}`);
            return res.status(500).json(
                MakeRestResponse(500, "Internal Server Error", true, {
                    error_details: "Iglu was unable to handle your request, please try again.",
                }),
            );
        }
    },
];
