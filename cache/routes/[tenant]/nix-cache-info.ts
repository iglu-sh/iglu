/*
 * This file returns the Nix cache info for any given cache
 * This is the format:
 * ```text/plain
 * StoreDir: /nix/store
 * WantMassQuery: 1
 * Priority: <priority>
 * ```
 * */

import { Tenants } from "@iglu-sh/shared/db";
import { IPFiltering, MakeRestResponse } from "@iglu-sh/shared/utils";
import type { Request, Response } from "express";

export const get = [
    IPFiltering(),
    async (req: Request, res: Response) => {
        const tenant_name = req.params.tenant;
        if (!tenant_name || typeof tenant_name !== "string") {
            return res.status(404).json(
                MakeRestResponse(404, "Not found", true, {
                    error_description: "The tenant requested does not exist",
                }),
            );
        }
        const tenant_list = await new Tenants().getByName(tenant_name);
        if (!tenant_list[0] || tenant_list.length !== 1) {
            return res.status(404).json(
                MakeRestResponse(404, "Not found", true, {
                    error_description: "The tenant requested does not exist",
                }),
            );
        }

        return res.status(200).send(`StoreDir: /nix/store
WantMassQuery: 1
Priority ${tenant_list[0].priority}
`);
    },
];
