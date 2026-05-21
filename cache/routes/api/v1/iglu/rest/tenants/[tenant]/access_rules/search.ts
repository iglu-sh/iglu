import { Access_Rules, Tenants } from "@iglu-sh/shared/db";
import { Logger } from "@iglu-sh/shared/logger";
import type { access_rule } from "@iglu-sh/shared/types";
import {
    Authentication,
    FilterFeatures,
    IPFiltering,
    MakeRestResponse,
} from "@iglu-sh/shared/utils";
import type { Request, Response } from "express";
import z from "zod";
import { convert_IP_to_number } from "@/shared/utils/ip";

const expected_query_params = z
    .object({
        name: z.string().optional(),
        ip: z.string().optional(),
    })
    .partial()
    .refine((data) => data.name !== undefined || data.ip !== undefined, {
        message: "At least one of name or ip must be defined",
        path: [""],
    });
const expected_route_params = z.object({
    tenant: z.string(),
});
export const get = [
    FilterFeatures("rest"),
    IPFiltering(),
    Authentication(),
    async (req: Request, res: Response) => {
        const parsed_query_params = expected_query_params.safeParse(req.query);
        const parsed_route_params = expected_route_params.safeParse(req.params);
        if (!parsed_query_params.success || !parsed_route_params.success) {
            return res.status(404).json(
                MakeRestResponse(404, "Invalid Params", true, {
                    error_details:
                        "You have not provided one of either the ip param or the name param.",
                }),
            );
        }

        const name_to_filter = parsed_query_params.data.name ?? "";
        const ip_to_filter = parsed_query_params.data.ip ?? "";

        const tenant_db = await new Tenants().getByName(parsed_route_params.data.tenant);
        if (!tenant_db[0]) {
            return res.status(404).json(
                MakeRestResponse(404, "Not found", true, {
                    error_details: "The tenant requested does not exist on this server",
                }),
            );
        }

        try {
            convert_IP_to_number(ip_to_filter);
        } catch (e) {
            Logger.debug(
                `Was unable to decode provided IP address to number in search access endpoint: ${e}`,
            );
            return res.status(400).json(
                MakeRestResponse(400, "Misc Client Error", true, {
                    error_details:
                        "You have provided an invalid IP Address in your IP Address Query, please try again with a valid one!",
                }),
            );
        }

        let return_rules: Array<access_rule> = [];
        // If only the name to filter is provided, we only filter by name
        if (name_to_filter !== "" && ip_to_filter === "") {
            Logger.debug("Using name filter");
            return_rules = await new Access_Rules().getByTenantAndName(
                name_to_filter,
                tenant_db[0].id,
            );
        }

        // If only the ip to filter is provided, we only filter by name
        if (ip_to_filter !== "" && name_to_filter === "") {
            Logger.debug("Using ip filter");
            return_rules = await new Access_Rules().getByIP(ip_to_filter, tenant_db[0].id, true);
        }

        // If both the name and ip are provied we filter by that
        if (ip_to_filter !== "" && name_to_filter !== "") {
            Logger.debug("Using both");
            return_rules = await new Access_Rules().getByTenantAndNameAndIP(
                name_to_filter,
                tenant_db[0].id,
                ip_to_filter,
            );
        }

        return res.status(200).json(MakeRestResponse(200, "Found", false, return_rules));
    },
];
