import type { NextFunction, Request, Response } from "express";
import { Api_keys, Api_keys_tenants_link, Tenants } from "../../db";
import { hashApiKey } from "../crypto/api_key_generation";
import MakeRestResponse from "./MakeResponse";
export default () => async (req: Request, res: Response, next: NextFunction) => {
    // Get the API Key for this
    if (!req.headers.authorization?.includes("Bearer")) {
        return res.status(403).json(
            MakeRestResponse(403, "Forbidden - No autorization", true, {
                error_details:
                    "You do not have a authorization header set, or your Header is not in the Bearer format. This ressource is not available without one",
            }),
        );
    }

    const auth_header_request_parts = req.headers.authorization.split(" ");
    if (!auth_header_request_parts[1]) {
        return res.status(403).json(
            MakeRestResponse(403, "Forbidden - No autorization", true, {
                error_details:
                    "You do not have a authorization header set, or your Header is not in the Bearer format. This ressource is not available without one",
            }),
        );
    }

    const key = auth_header_request_parts[1];
    const api_key = await new Api_keys().getByHash(hashApiKey(key.trim()));
    if (api_key === null) {
        return res.status(401).json(
            MakeRestResponse(401, "Unauthorized", true, {
                error_details: "This key is not recognized",
            }),
        );
    }

    // Check if there's a tenant name in the request
    const TENANT_NAME = req.params.tenant;
    if (!TENANT_NAME || Array.isArray(TENANT_NAME)) {
        // This means that there's no tenant and provided we got a recognized API Key we will call the next function to continue
        next();
    } else {
        // This means there **is** a tenant here and we should try to match these two together
        const tenant_info = await new Tenants().getByName(TENANT_NAME);

        // This means we either have more than one or no tenant found, in either case we will return a 404
        if (tenant_info.length !== 1 || !tenant_info[0]) {
            return res.status(404).json(
                MakeRestResponse(404, "Not found", true, {
                    error_details: "This tenant does not exist",
                }),
            );
        }

        const tenant = tenant_info[0];

        // Try to match the api key and the tenant
        const link_records = await new Api_keys_tenants_link().getByTenantAndKey(
            api_key.id,
            tenant.id,
        );
        if (link_records === null || link_records.length === 0) {
            return res.status(401).json(
                MakeRestResponse(401, "Unauthorized", true, {
                    error_details: "This key is not recognized",
                }),
            );
        }

        // After all this, we allow the request through
        next();
    }
};
