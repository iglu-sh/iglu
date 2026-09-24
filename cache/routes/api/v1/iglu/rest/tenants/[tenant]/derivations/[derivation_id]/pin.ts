import type { openapi_definiton } from "@iglu-sh/shared";
import { Derivation_tenant_link, Tenants } from "@iglu-sh/shared/db";
import { Logger } from "@iglu-sh/shared/logger";
import {
    Authentication,
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

const expected_route_params = z.object({
    tenant: z.string(),
    derivation_id: z.uuid(),
});

export const openapi: openapi_definiton = {
    meta: {
        path: "/api/v1/iglu/rest/tenants/{tenant}/derivations/{derivation_id}/pin",
        authentication_required: true,
        feature_filtered: true,
        tags: ["api/v1/iglu/rest/tenants", "iglu"],
    },
    routes: [
        {
            method: "get",
            description: "Pin a given derivation so it isn't garbage collected anymore",
            summary: "Pin derivation",
            request: {
                params: expected_route_params,
            },
            responses: {
                200: {
                    description:
                        "Informational response, returned when request completed successfully",
                    content: {
                        "application/json": {
                            schema: base_response_schema.extend(
                                z.object({
                                    is_error: z.literal(false),
                                    data: z.object({
                                        information: z.enum([
                                            "Derivation pinned successfully",
                                            "Derivation unpinned successfully",
                                        ]),
                                    }),
                                }).shape,
                            ),
                        },
                    },
                },
                500: {
                    description:
                        "Returned when iglu encounters an error while pinning the derivation",
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

        try {
            await new Derivation_tenant_link().update({
                ...derivation,
                pin: !derivation.pin,
            });
            return res.status(200).json(
                MakeRestResponse(200, "Success", false, {
                    information: !derivation.pin
                        ? "Derivation pinned successfully"
                        : "Derivation unpinned successfully",
                }),
            );
        } catch (e) {
            Logger.error(`Unable to remove pin from derivation: ${e}`);
            return res.status(500).json(
                MakeRestResponse(500, "Internal Server Error", true, {
                    error_details: "Iglu was unable to handle your request. Please try again!",
                }),
            );
        }
    },
];
