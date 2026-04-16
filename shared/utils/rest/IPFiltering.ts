import Logger from "@/logger";

import type { Request, Response } from "express";
import MakeRestResponse from "./MakeResponse";
import Access_Rules from "../../db/DAO/access_rules";
import Tenants from "../../db/DAO/tenants";
export default () => async (req: Request, res: Response, next: NextFunction) => {
    // Get the IP address, if there is no IP deny
    var ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
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

    const tenant_name = req.params.tenant;
    if (!tenant_name || typeof tenant_name !== "string") {
        Logger.debug(`IPFiltering: No rule applied to route without tenant`);
        return next();
    }

    const tenant = await new Tenants().getByName(tenant_name);
    if (tenant.length !== 1 || !tenant[0]) {
        Logger.debug(`IPFiltering: Tenant wasn't found, chaining to next middleware`);
        return next();
    }

    // Check the IP Rule
    const access_rules = await new Access_Rules().getByIP(ip, tenant[0].id);

    if (access_rules === null || access_rules.length === 0 || !access_rules[0]) {
        // If there's no rule, then we deny
        return res.status(403).json(
            MakeRestResponse(403, "Access Forbidden", true, {
                error_details: "You are not allowed to access this cache",
            }),
        );
    }

    // The first rule is the one we are interested in as that is the one we are actually respecting
    if (access_rules[0].action === "drop") {
        return res.status(403).json(
            MakeRestResponse(403, "Access Forbidden", true, {
                error_details: "You are not allowed to access this cache",
            }),
        );
    }

    return next();
};
