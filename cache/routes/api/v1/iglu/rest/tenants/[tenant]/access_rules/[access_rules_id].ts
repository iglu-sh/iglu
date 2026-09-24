import { Access_Rules, Tenants } from "@iglu-sh/shared/db";
import { Logger } from "@iglu-sh/shared/logger";
import {
    Authentication,
    access_rule_schema,
    FilterFeatures,
    IPFiltering,
    MakeRestResponse,
} from "@iglu-sh/shared/utils";
import { cidr_to_range, convert_IP_to_number } from "@iglu-sh/shared/utils/ip";
import {
    access_rules_rest_schema,
    base_response_schema,
    error_response_schema,
} from "@iglu-sh/shared/utils/zod/zod_rest_schemas";
import { json, type Request, type Response } from "express";
import z from "zod";
import type { openapi_definiton } from "@/shared";

const expected_route_params = z.object({
    tenant: z.string(),
    access_rules_id: z.string(),
});

const expected_query_params = z.object({
    confirm: z.string().optional(),
});

export const openapi: openapi_definiton = {
    meta: {
        path: "/api/v1/iglu/rest/tenants/{tenant}/access_rules/{access_rules_id}",
        authentication_required: true,
        feature_filtered: true,
        tags: ["api/v1/iglu/rest/tenants", "iglu"],
    },
    routes: [
        {
            method: "get",
            description: "Get detailed information about the Access rule",
            summary: "Get Access Rule",
            request: {
                params: expected_route_params,
            },
            responses: {
                200: {
                    description: "Response containing the access rule",
                    content: {
                        "application/json": {
                            schema: base_response_schema.extend(
                                z.object({
                                    is_error: z.literal(false),
                                    data: access_rule_schema,
                                }).shape,
                            ),
                        },
                    },
                },
            },
        },
        {
            method: "delete",
            description: "Delete a given Access Rule",
            summary: "Delete Access Rule",
            request: {
                params: expected_route_params,
                query: expected_query_params,
            },
            responses: {
                200: {
                    description: "Informational Response after the rule is deleted",
                    content: {
                        "application/json": {
                            schema: base_response_schema.extend(
                                z.object({
                                    is_error: z.literal(false),
                                    data: z.object({
                                        information: z.literal("Access rule deleted successfully!"),
                                    }),
                                }).shape,
                            ),
                        },
                    },
                },
                423: {
                    description:
                        "Returned when attempting to delete the last access rule without the confirm query param",
                    content: {
                        "application/json": {
                            schema: error_response_schema,
                        },
                    },
                },
            },
        },
        {
            method: "patch",
            description: "Update a given Access Rule",
            summary: "Update Access Rule",
            request: {
                params: expected_route_params,
                body: {
                    description: "The new state the access rule should reflect",
                    required: true,
                    content: {
                        "application/json": {
                            schema: access_rules_rest_schema,
                        },
                    },
                },
            },
            responses: {
                200: {
                    description: "Returns the new state of the given access rule",
                    content: {
                        "application/json": {
                            schema: base_response_schema.extend(
                                z.object({
                                    is_error: z.literal(false),
                                    data: access_rule_schema,
                                }).shape,
                            ),
                        },
                    },
                },
                422: {
                    description: "Returned when the provided body was in an invalid shape",
                    content: {
                        "application/json": {
                            schema: error_response_schema,
                        },
                    },
                },
                423: {
                    description:
                        "Returned when a rule update would result in locking out the request IP. This update can be made regardless of that, if the confirm query param is provided",
                    content: {
                        "application/json": {
                            schema: error_response_schema,
                        },
                    },
                },
                500: {
                    description: "Returned if the updated was unsuccessfull on iglu's part",
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
                    error_details: "Your route params are not in the correct format.",
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

        const rule = await new Access_Rules().getById(route_params.data.access_rules_id);
        if (rule === null) {
            return res.status(404).json(
                MakeRestResponse(404, "Not found", true, {
                    error_details: "The access rule that was requested could not be found.",
                }),
            );
        }

        return res.status(200).json(MakeRestResponse(200, "Found", false, rule));
    },
];

export const del = [
    FilterFeatures("rest"),
    IPFiltering(),
    Authentication(),
    async (req: Request, res: Response) => {
        const route_params = expected_route_params.safeParse(req.params);
        const query_params = expected_query_params.safeParse(req.query);
        if (!route_params.success) {
            return res.status(404).json(
                MakeRestResponse(404, "Invalid Params", true, {
                    error_details: "Your route params are not in the correct format",
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

        const rule = await new Access_Rules().getById(route_params.data.access_rules_id);

        if (!rule) {
            return res.status(404).json(
                MakeRestResponse(404, "Not found", true, {
                    error_details: "The access rule that was requested could not be found.",
                }),
            );
        }

        const all_rules_for_tenant = await new Access_Rules().getByTenant(tenant_db[0].id, true);
        if (
            all_rules_for_tenant.length - 1 === 0 &&
            (!query_params.data?.confirm || query_params.data?.confirm !== "true")
        ) {
            return res.status(423).json(
                MakeRestResponse(423, "Locked", true, {
                    error_details:
                        "This is the last access rule for this tenant. If you delete this rule, every request will be rejected. If you are sure about this, provide the ?confirm=true param",
                }),
            );
        }

        await new Access_Rules().delete(rule);
        return res.status(201).json(
            MakeRestResponse(201, "Success", false, {
                information: "Access rule deleted successfully!",
            }),
        );
    },
];

export const patch = [
    FilterFeatures("rest"),
    IPFiltering(),
    Authentication(),
    json(),
    async (req: Request, res: Response) => {
        const route_params = expected_route_params.safeParse(req.params);
        const query_params = expected_query_params.safeParse(req.query);

        if (!route_params.success) {
            return res.status(404).json(
                MakeRestResponse(404, "Invalid Params", true, {
                    error_details: "Your route params are not in the correct format",
                }),
            );
        }

        const parsed_body = access_rules_rest_schema.safeParse(req.body);
        if (!parsed_body.success) {
            return res.status(422).json(
                MakeRestResponse(422, "Malformed Body", true, {
                    error_details:
                        "Your request body does not adhere to the access_rules schema, please correct your error and try again.",
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

        const rule = await new Access_Rules().getById(route_params.data.access_rules_id);

        if (!rule) {
            return res.status(404).json(
                MakeRestResponse(404, "Not found", true, {
                    error_details: "The access rule that was requested could not be found.",
                }),
            );
        }

        var ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress;
        if (!ip || typeof ip !== "string") {
            Logger.warn(
                `Could not determine IP Address for request, consider configuring the x-forwarded-for header if you are using a reverse proxy`,
            );
            return res.status(403).json(
                MakeRestResponse(403, "Access Forbidden", true, {
                    error_details: "You are not allowed to access this cache",
                }),
            );
        }

        const { range_start, range_end } = cidr_to_range(parsed_body.data.ip_block);
        const current_ip_as_number = convert_IP_to_number(ip);
        if (
            current_ip_as_number >= range_start &&
            current_ip_as_number <= range_end &&
            parsed_body.data.action === "drop" &&
            (!query_params.data?.confirm || query_params.data?.confirm !== "true")
        ) {
            return res.status(423).json(
                MakeRestResponse(423, "Locked", true, {
                    error_details:
                        "This rule would lock yourself out if you do not have a rule configured with a lower priority than this that allows your IP to connect (this endpoint does not know that). If you still wish to do this, provide the ?confirm=true param in your request",
                }),
            );
        }

        try {
            const updated_rule = await new Access_Rules().update({
                ...parsed_body.data,
                id: rule.id,
                start_ip: range_start,
                end_ip: range_end,
                tenants_id: tenant_db[0],
            });
            return res.status(200).json(MakeRestResponse(200, "Success", false, updated_rule));
        } catch (e) {
            Logger.debug(`Error whilst updating Access Rule for tenant ${tenant_db[0].id}: ${e}`);
            return res.status(500).json(
                MakeRestResponse(500, "Internal Server Error", true, {
                    error_details: "Iglu was unable to process your request, please try again",
                }),
            );
        }
    },
];
