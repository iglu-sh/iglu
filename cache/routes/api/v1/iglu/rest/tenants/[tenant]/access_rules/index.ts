import { Access_Rules, Tenants } from "@iglu-sh/shared/db";
import { Logger } from "@iglu-sh/shared/logger";
import {
    Authentication,
    FilterFeatures,
    IPFiltering,
    MakeRestResponse,
} from "@iglu-sh/shared/utils";
import { cidr_to_range, convert_IP_to_number } from "@iglu-sh/shared/utils/ip";
import { json, type Request, type Response } from "express";
import z from "zod";
import { access_rules_rest_schema } from "@/shared/utils/zod/zod_rest_schemas";

const expected_route_params = z.object({
    tenant: z.string(),
});
const expected_query_params = z.object({
    confirm: z.string().optional(),
});

export const post = [
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
                    error_details: "Your route params are not in the correct format.",
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

        const tenant_db = await new Tenants().getByName(route_params.data.tenant);
        if (!tenant_db[0]) {
            return res.status(404).json(
                MakeRestResponse(404, "Not found", true, {
                    error_details: "The tenant requested does not exist on this server",
                }),
            );
        }

        try {
            const rule = await new Access_Rules().insert({
                ...parsed_body.data,
                id: "n/a",
                tenants_id: tenant_db[0],
                start_ip: range_start,
                end_ip: range_end,
            });

            return res.status(201).json(MakeRestResponse(201, "Created", false, rule));
        } catch (e) {
            Logger.debug(`Error whilst inserting Access Rule for tenant ${tenant_db[0].id}: ${e}`);
            return res.status(500).json(
                MakeRestResponse(500, "Internal Server Error", true, {
                    error_details: "Iglu was unable to process your request, please try again",
                }),
            );
        }
    },
];
