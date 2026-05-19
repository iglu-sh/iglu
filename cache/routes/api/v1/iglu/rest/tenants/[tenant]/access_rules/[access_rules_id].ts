import { Access_Rules, Tenants } from "@iglu-sh/shared/db";
import {
    Authentication,
    FilterFeatures,
    IPFiltering,
    MakeRestResponse,
} from "@iglu-sh/shared/utils";
import type { Request, Response } from "express";
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

        const all_rules_for_tenant = await new Access_Rules().getByTenant(tenant_db[0].id);
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
    },
];
