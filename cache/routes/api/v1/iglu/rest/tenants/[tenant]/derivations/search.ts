import type { openapi_definiton } from "@iglu-sh/shared";
import { Derivation_tenant_link, Tenants } from "@iglu-sh/shared/db";
import {
    Authentication,
    derivations_tenants_links_schema,
    FilterFeatures,
    IPFiltering,
    MakeRestResponse,
} from "@iglu-sh/shared/utils";
import {
    base_response_schema,
    error_response_schema,
} from "@iglu-sh/shared/utils/zod/zod_rest_schemas";
import type { Request, Response } from "express";
import z from "zod";

const expected_query_params = z.object({
    query: z.string(),
});
const expected_route_params = z.object({
    tenant: z.string(),
});

export const openapi: openapi_definiton = {
    meta: {
        path: "/api/v1/iglu/rest/tenants/{tenant}/derivations/search",
        authentication_required: true,
        feature_filtered: true,
        tags: ["api/v1/iglu/rest/tenants", "iglu"],
    },
    routes: [
        {
            method: "get",
            description:
                "Search for a derivation in the given tenant. The query parameter either takes a uuid (which then searches by ID in the database which means only one or no records are returned), or by nix store hash",
            summary: "Search for derivation",
            request: {
                params: expected_route_params,
                query: expected_query_params,
            },
            responses: {
                200: {
                    description:
                        "Response containing the results of your search. CAREFULL: The data array may be empty!",
                    content: {
                        "application/json": {
                            schema: base_response_schema.extend(
                                z.object({
                                    is_error: z.literal(false),
                                    data: z.array(derivations_tenants_links_schema),
                                }).shape,
                            ),
                        },
                    },
                },
                499: {
                    description:
                        "Returned in the event the query parameter was provided as uuid but that ID was not found in the database",
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
        const query_params = expected_query_params.safeParse(req.query);
        const route_params = expected_route_params.safeParse(req.params);
        if (!query_params.success || !route_params.success) {
            return res.status(404).json(
                MakeRestResponse(404, "Invalid Params", true, {
                    error_details: "You have not provided the ?query param",
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

        const param_is_uuid = z.uuid().safeParse(query_params.data.query).success;
        if (param_is_uuid) {
            const derivation = await new Derivation_tenant_link().getByDerivationID(
                query_params.data.query,
                tenant_db[0].id,
            );
            if (derivation === null) {
                return res.status(499).json(
                    MakeRestResponse(499, "Not found", true, {
                        error_details:
                            "The derivation that was requested is not cached in this tenant.",
                    }),
                );
            }

            return res.status(200).json(
                MakeRestResponse(200, "Found", false, [
                    {
                        ...derivation,
                        derivations_id: {
                            ...derivation.derivations_id,
                            signing_keys_id: {
                                ...derivation.signing_keys_id,
                                api_keys_id: {
                                    ...derivation.signing_keys_id.api_keys_id,
                                    hash: "<ommited>",
                                },
                            },
                        },
                    },
                ]),
            );
        }

        const derivations = await new Derivation_tenant_link().searchByNixStoreHashAndTenant(
            query_params.data.query,
            tenant_db[0].id,
        );
        return res.status(200).json(
            MakeRestResponse(
                200,
                "Found",
                false,
                derivations.map((derivation)=>{
                    return {
                        ...derivation,
                        signing_keys_id: {
                            ...derivation.signing_keys_id,
                            api_keys_id: {
                                ...derivation.signing_keys_id.api_keys_id,
                                hash: "<ommitted>"
                            }
                        }
                    }
                })
            ),
        );
    },
];
