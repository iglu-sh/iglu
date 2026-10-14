import type { Request, Response } from "express";
import { Access_Rules, Tenants } from "../../db";
import { Logger } from "../../logger";
import { Configuration } from "../cache";
import { cidr_to_range, convert_IP_to_number } from "../ip";
import MakeRestResponse from "./MakeResponse";

export default () => async (req: Request, res: Response, next: NextFunction) => {
    // Get the IP address, if there is no IP deny
    var ip = req.socket?.remoteAddress;

    // TODO: Check if this actually works behind a reverse proxy.
    // Check if the req.socket.remoteAddress is a trusted proxy if it is configured
    const trusted_proxy_ranges = Configuration.getConfig().server.trusted_proxies;
    if (trusted_proxy_ranges.length === 0 && Configuration.getConfig().server.use_reverse_proxy) {
        Logger.warn(`No trusted proxies configured, falling back to pure TCP Peer Address.`);
    }
    if (trusted_proxy_ranges.length > 0 && Configuration.getConfig().server.use_reverse_proxy) {
        const ip_in_x_forwarded_for = req.headers["x-forwarded-for"];
        if (!ip_in_x_forwarded_for) {
            Logger.warn(
                "Received request in reverse proxy mode but x-forwarded-for was not set. Discarding this request as I cannot reliably determine the IP Address of this request.",
            );
            return res.status(403).json(
                MakeRestResponse(403, "Access Forbidden", true, {
                    error_details: "You are not allowed to access this cache",
                }),
            );
        }
        const peerAddress = req.socket?.remoteAddress;
        if (!peerAddress) {
            Logger.error(
                "Unable to determine peer address in IP Filtering Middleware: The Iglu Server was unable to determine if an incoming request was proxied through your reverse proxy and will reject this request",
            );
            return res.status(403).json(
                MakeRestResponse(403, "Access Forbidden", true, {
                    error_details: "You are not allowed to access this cache",
                }),
            );
        }

        let was_proxied_through_proxy: boolean = false;
        const ip_as_number = convert_IP_to_number(peerAddress);
        for (const range of trusted_proxy_ranges) {
            const { range_start, range_end } = cidr_to_range(range);
            if (range_start <= ip_as_number && ip_as_number <= range_end) {
                was_proxied_through_proxy = true;
                break;
            }
        }

        if (!was_proxied_through_proxy) {
            Logger.error(`Received request from untrusted proxy. Address: ${peerAddress}`);
            return res.status(403).json(
                MakeRestResponse(403, "Access Forbidden", true, {
                    error_details: "You are not allowed to access this cache",
                }),
            );
        }

        if (ip_in_x_forwarded_for && !Array.isArray(ip_in_x_forwarded_for)) {
            ip = ip_in_x_forwarded_for;
        }
    }
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
    try {
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
    } catch (e) {
        Logger.debug(
            `Caught error whilst retrieving Access Rules in IP Filtering Middleware (Malformed IP provided?) ${e}`,
        );
        return res.status(403).json(
            MakeRestResponse(403, "Access Forbidden", true, {
                error_details: "You are not allowed to access this cache",
            }),
        );
    }

    return next();
};
