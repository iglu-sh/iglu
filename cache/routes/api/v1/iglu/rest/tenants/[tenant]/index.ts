import { Tenants } from "@iglu-sh/shared/db";
import { Logger } from "@iglu-sh/shared/logger";
import { MakeRestResponse, tenant_schema } from "@iglu-sh/shared/utils";
import { Configuration } from "@iglu-sh/shared/utils/cache/Configuration";
import Authentication from "@iglu-sh/shared/utils/rest/Authentication";
import FilterFeatures from "@iglu-sh/shared/utils/rest/FilterFeatures";
import IPFiltering from "@iglu-sh/shared/utils/rest/IPFiltering";
import type { Request, Response } from "express";
import bodyParser from "express";
import { z } from "zod";
import type { openapi_definiton } from "@/shared";
import { base_response_schema, error_response_schema } from "@/shared/utils/zod/zod_rest_schemas";

const param_schema = z.object({
    tenant: z.string(),
});

export const openapi: openapi_definiton = {
    meta: {
        path: "/api/v1/iglu/rest/tenants/{tenant}",
        authentication_required: true,
        feature_filtered: true,
        tags: ["api/v1/iglu/rest/tenants", "iglu"],
    },
    routes: [
        {
            method: "get",
            description: "Get detailed information about a tenant",
            summary: "Get Tenant information",
            request: {
                params: param_schema,
            },
            responses: {
                200: {
                    description: "Success response containing the tenant",
                    content: {
                        "application/json": {
                            schema: base_response_schema.extend(
                                z.object({
                                    is_error: z.literal(false),
                                    data: tenant_schema,
                                }).shape,
                            ),
                        },
                    },
                },
            },
        },
        {
            method: "patch",
            description: "Change aspects of a tenant",
            summary: "Update a tenant",
            request: {
                params: param_schema,
                body: {
                    description: "New state of the tenant",
                    content: {
                        "application/json": {
                            schema: tenant_schema,
                        },
                    },
                },
            },
            responses: {
                200: {
                    description: "New state of the tenant after the update",
                    content: {
                        "application/json": {
                            schema: base_response_schema.extend(
                                z.object({
                                    is_error: z.literal(false),
                                    data: tenant_schema,
                                }).shape,
                            ),
                        },
                    },
                },
                422: {
                    description:
                        "Returned when the body you provided was not in the correct format",
                    content: {
                        "application/json": {
                            schema: error_response_schema,
                        },
                    },
                },
                500: {
                    description:
                        "Returned when the creation failed on iglu's part. Referr to the error information for more detail",
                    content: {
                        "application/json": {
                            schema: error_response_schema,
                        },
                    },
                },
            },
        },
        {
            method: "delete",
            description: "Delete a given tenant",
            summary: "Delete a tenant",
            request: {
                params: param_schema,
            },
            responses: {
                201: {
                    description: "Informational response after tenant deletion",
                    content: {
                        "application/json": {
                            schema: base_response_schema.extend(
                                z.object({
                                    is_error: z.literal(false),
                                    data: z.object({
                                        information: z.literal("Tenant deleted successfully"),
                                    }),
                                }).shape,
                            ),
                        },
                    },
                },
                500: {
                    description:
                        "Returned when the creation failed on iglu's part. Referr to the error information for more detail",
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
        const param_parsed = param_schema.safeParse(req.params);
        if (!param_parsed.success) {
            return res.status(404).json(
                MakeRestResponse(404, "Not found", true, {
                    error_details: "No Tenant found with that name",
                }),
            );
        }

        const tenant_list = await new Tenants().getByName(param_parsed.data.tenant);
        if (!tenant_list[0]) {
            return res.status(404).json(
                MakeRestResponse(404, "Not found", true, {
                    error_details: "No Tenant found with that name",
                }),
            );
        }
        const tenant = tenant_list[0];

        return res.status(200).json(MakeRestResponse(200, "Success", false, tenant));
    },
];

export const patch = [
    FilterFeatures("rest"),
    IPFiltering(),
    Authentication(),
    bodyParser.json(),
    async (req: Request, res: Response) => {
        const param_parsed = param_schema.safeParse(req.params);
        const body_parsed = tenant_schema.safeParse(req.body);

        if (!param_parsed.success) {
            return res.status(404).json(
                MakeRestResponse(404, "Not found", true, {
                    error_details: "No Tenant found with that name",
                }),
            );
        }

        if (!body_parsed.success) {
            return res.status(422).json(
                MakeRestResponse(422, "Unprocessable Content", true, {
                    error_details:
                        "Your body is not in the correct format. It needs to be in accordance with the tenant schema.",
                }),
            );
        }

        const tenant_list = await new Tenants().getByName(param_parsed.data.tenant);
        if (!tenant_list[0]) {
            return res.status(404).json(
                MakeRestResponse(404, "Not found", true, {
                    error_details: "No Tenant found with that name",
                }),
            );
        }

        try {
            const updated_tenant = await new Tenants().update({
                ...body_parsed.data,
                uri: `${Configuration.getConfig().server.hostname}/${body_parsed.data.name}`,
                id: tenant_list[0].id,
            });

            return res.status(200).json(MakeRestResponse(200, "Success", false, updated_tenant));
        } catch (e) {
            Logger.error(`Error whilst updating tenant: ${e}`);
            return res.status(500).json(
                MakeRestResponse(500, "Internal Server Error", true, {
                    error_details: "Iglu was unable to handle your request. Try again later.",
                }),
            );
        }
    },
];

export const del = [
    FilterFeatures("rest"),
    IPFiltering(),
    Authentication(),
    async (req: Request, res: Response) => {
        const param_parsed = param_schema.safeParse(req.params);
        if (!param_parsed.success) {
            return res.status(404).json(
                MakeRestResponse(404, "Not found", true, {
                    error_details: "No Tenant found with that name",
                }),
            );
        }

        const tenant = await new Tenants().getByName(param_parsed.data.tenant);
        if (tenant.length !== 1 || !tenant[0]) {
            return res.status(404).json(
                MakeRestResponse(404, "Not found", true, {
                    error_details: "No Tenant found with that name",
                }),
            );
        }

        // In this route, we may rely on the authentication middleware to make sure that this codepath only gets executed when the api key actually is authenticated to perform actions on this tenant
        try {
            await new Tenants().delete(tenant[0]);
            return res.status(201).json(
                MakeRestResponse(201, "Success", false, {
                    information: "Tenant deleted successfully",
                }),
            );
        } catch (e) {
            Logger.error(
                `Unable to delete tenant with name: ${param_parsed.data.tenant}, error: ${e}`,
            );
            return res.status(500).json(
                MakeRestResponse(500, "Internal Server Error", true, {
                    error_details: "Iglu was unable to handle your request. Try again later.",
                }),
            );
        }
    },
];
