import { Access_Rules, Tenants } from "@iglu-sh/shared/db";
import { Logger } from "@iglu-sh/shared/logger";
import {
    Authentication,
    FilterFeatures,
    IPFiltering,
    MakeRestResponse,
} from "@iglu-sh/shared/utils";
import { cidr_to_range, convert_IP_to_number } from "@iglu-sh/shared/utils/ip";
import { access_rules_rest_schema } from "@iglu-sh/shared/utils/zod/rest";
import { json, type Request, type Response } from "express";
import z from "zod";

const expected_route_params = z.object({
    tenant: z.string(),
    access_rules_id: z.string(),
});

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

const expected_query_params = z.object({
    confirm: z.string().optional(),
});
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
        return res.status(200).json(
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
