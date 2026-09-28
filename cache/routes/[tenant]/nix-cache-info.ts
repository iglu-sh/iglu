/*
 * This file returns the Nix cache info for any given cache
 * This is the format:
 * ```text/plain
 * StoreDir: /nix/store
 * WantMassQuery: 1
 * Priority: <priority>
 * ```
 * */

import type { openapi_definiton } from "@iglu-sh/shared";
import { Tenants } from "@iglu-sh/shared/db";
import { IPFiltering, MakeRestResponse } from "@iglu-sh/shared/utils";
import { error_response_schema } from "@iglu-sh/shared/utils/zod/zod_rest_schemas";
import type { Request, Response } from "express";
import { z } from "zod";

export const openapi: openapi_definiton = {
    meta: {
        path: "/{tenant}/nix-cache-info",
        authentication_required: false,
        feature_filtered: false,
        tags: ["nix"],
    },
    routes: [
        {
            method: "get",
            description: "Get the standardized nix cache info response",
            summary: "Get nix cache info",
            request: {
                params: z.object({
                    tenant: z.string(),
                }),
            },
            responses: {
                200: {
                    description: "Standardized nix cache info response",
                    content: {
                        "text/x-nix-cache-info": {
                            schema: z.literal(`
StoreDir: /nix/store
WantMassQuery: 1
Priority: <tenant_priority>
                                              `),
                        },
                    },
                },
                404: {
                    description:
                        "Returned when the tenant does not exist or your route params were in the wrong format",
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
    async (req: Request, res: Response) => {
        const tenant_name = req.params.tenant;
        if (!tenant_name || typeof tenant_name !== "string") {
            return res.status(404).json(
                MakeRestResponse(404, "Not found", true, {
                    error_details: "The tenant requested does not exist",
                }),
            );
        }
        const tenant_list = await new Tenants().getByName(tenant_name);
        if (!tenant_list[0] || tenant_list.length !== 1) {
            return res.status(404).json(
                MakeRestResponse(404, "Not found", true, {
                    error_details: "The tenant requested does not exist",
                }),
            );
        }
        res.set("content-type", "text/x-nix-cache-info");
        return res.status(200).send(`StoreDir: /nix/store
WantMassQuery: 1
Priority ${tenant_list[0].priority}
`);
    },
];
