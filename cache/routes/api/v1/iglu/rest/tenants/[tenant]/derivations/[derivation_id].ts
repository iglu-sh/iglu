import { Derivation_tenant_link, delete_derivation, Tenants } from "@iglu-sh/shared/db";
import { Logger } from "@iglu-sh/shared/logger";
import {
    Authentication,
    derivations_schema,
    FilterFeatures,
    IPFiltering,
    MakeRestResponse,
} from "@iglu-sh/shared/utils";
import type { Request, Response } from "express";
import z from "zod";
import type { openapi_definiton } from "@/shared";
import { base_response_schema, error_response_schema } from "@/shared/utils/zod/zod_rest_schemas";

const expected_route_params = z.object({
    tenant: z.string(),
    derivation_id: z.uuid(),
});

export const openapi: openapi_definiton = {
    meta: {
        path: "/api/v1/iglu/rest/tenants/{tenant}/derivations/{derivation_id}",
        authentication_required: true,
        feature_filtered: true,
        tags: ["api/v1/iglu/rest/tenants", "iglu"],
    },
    routes: [
        {
            method: "get",
            description: "Get detailed information about a given derivation",
            summary: "Get information about derivation",
            request: {
                params: expected_route_params,
            },
            responses: {
                200: {
                    description: "Response containing the derivation",
                    content: {
                        "application/json": {
                            schema: base_response_schema.extend(
                                z.object({
                                    is_error: z.literal(false),
                                    data: derivations_schema,
                                }).shape,
                            ),
                        },
                    },
                },
            },
        },
        {
            method: "delete",
            description: "Manually delete a given derivation",
            summary: "Delete derivation",
            request: {
                params: expected_route_params,
            },
            responses: {
                201: {
                    description: "Informational response after the deletion",
                    content: {
                        "application/json": {
                            schema: base_response_schema.extend(
                                z.object({
                                    is_error: z.literal(false),
                                    data: z.object({
                                        information: z.literal("Derivation deleted successfully"),
                                    }),
                                }).shape,
                            ),
                        },
                    },
                },
                500: {
                    description:
                        "Returned if iglu was unable to fullfill the request, but the error happend on iglu's part",
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
    FilterFeatures("rest"),
    IPFiltering(),
    Authentication(),
    async (req: Request, res: Response) => {
        const route_params = expected_route_params.safeParse(req.params);
        if (!route_params.success) {
            return res.status(404).json(
                MakeRestResponse(404, "Invalid Params", true, {
                    error_details:
                        "Your route params are not in the correct format. This endpoint does not accept cstorehashes as the derivation_id!",
                }),
            );
        }

        const tenant_db = await new Tenants().getByName(route_params.data.tenant);
        if (!tenant_db[0]) {
            return res.status(404).json(
                MakeRestResponse(404, "Not found", true, {
                    error_details: "The tenant requested does not exist on this server",
                }),
            );
        }

        const derivation = await new Derivation_tenant_link().getByDerivationID(
            route_params.data.derivation_id,
            tenant_db[0].id,
        );
        if (derivation === null) {
            return res.status(404).json(
                MakeRestResponse(404, "Not found", true, {
                    error_details:
                        "The derivation that was requested is not cached in this tenant.",
                }),
            );
        }

        return res.status(200).json(
            MakeRestResponse(200, "Found", false, [
                {
                    ...derivation.derivations_id,
                    signing_keys_id: {
                        ...derivation.signing_keys_id,
                        api_keys_id: {
                            ...derivation.signing_keys_id.api_keys_id,
                            hash: "<ommited>",
                        },
                    },
                },
            ]),
        );
    },
];

export const del = [
    FilterFeatures("rest"),
    IPFiltering(),
    Authentication(),
    async (req: Request, res: Response) => {
        const route_params = expected_route_params.safeParse(req.params);
        if (!route_params.success) {
            return res.status(404).json(
                MakeRestResponse(404, "Invalid Params", true, {
                    error_details:
                        "Your route params are not in the correct format. This endpoint does not accept cstorehashes as the derivation_id!",
                }),
            );
        }

        const tenant_db = await new Tenants().getByName(route_params.data.tenant);
        if (!tenant_db[0]) {
            return res.status(404).json(
                MakeRestResponse(404, "Not found", true, {
                    error_details: "The tenant requested does not exist on this server",
                }),
            );
        }

        const derivation = await new Derivation_tenant_link().getByDerivationID(
            route_params.data.derivation_id,
            tenant_db[0].id,
        );
        if (derivation === null) {
            return res.status(404).json(
                MakeRestResponse(404, "Not found", true, {
                    error_details:
                        "The derivation that was requested is not cached in this tenant.",
                }),
            );
        }

        try {
            await delete_derivation(derivation);
            return res.status(201).json(
                MakeRestResponse(201, "Success", false, {
                    information: "Derivation deleted successfully",
                }),
            );
        } catch (e) {
            Logger.error(`Could not delete derivation: ${e}`);
            return res.status(500).json(
                MakeRestResponse(500, "Internal Server Error", true, {
                    error_details: "Iglu was unable to handle your request, try again!",
                }),
            );
        }
    },
];
