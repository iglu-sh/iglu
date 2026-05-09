/*
 * Response format:
 * Array<string>
 *
 * Return format:
 * Array<string>
 * */

import type { Request, Response } from "express";
import bodyParser from "express";
import z from "zod";
import type { request } from "@iglu-sh/shared/types";
import { Logger } from "@iglu-sh/shared/logger";
import { Derivation_tenant_link, Requests, Tenants } from "@iglu-sh/shared/db";
import { Authentication, IPFiltering, MakeRestResponse } from "@iglu-sh/shared/utils";

const body_format = z.array(z.string());
export const post = [
    IPFiltering(),
    Authentication(),
    bodyParser.json({ limit: "50mb" }),
    async (req: Request, res: Response) => {
        const TENANT_NAME = req.params.tenant;
        if (!TENANT_NAME || Array.isArray(TENANT_NAME)) {
            Logger.debug("Narinfo request did not contain tenant");
            return res.status(404).json(
                MakeRestResponse(404, "Not found", true, {
                    error_description: "Did not find cache with the given name",
                }),
            );
        }

        const BODY_ARRAY = req.body;
        if (!BODY_ARRAY || !Array.isArray(BODY_ARRAY)) {
            return res.status(400).json(
                MakeRestResponse(400, "Invalid Body", true, {
                    error_description: "The Request body is malformed",
                }),
            );
        }

        const verified_body_array = body_format.safeParse(BODY_ARRAY);
        if (!verified_body_array.success) {
            return res.status(400).json(
                MakeRestResponse(400, "Invalid Body", true, {
                    error_description: "The Request body is malformed",
                }),
            );
        }

        // Get the tenant from the database
        const tenant = await new Tenants().getByName(TENANT_NAME);

        if (tenant.length !== 1 || !tenant[0]) {
            Logger.debug(
                "Narinfo request returned inconclusive database response (no tenant found or multiple with same name, cannot continue)",
            );
            return res.status(404).json(
                MakeRestResponse(404, "Not found", true, {
                    error_description: "Did not find cache with the given name",
                }),
            );
        }

        // Get the stored records from the array in the body
        const hashes_stored_in_db = await new Derivation_tenant_link().getByNixStoreHashes(
            verified_body_array.data,
            tenant[0].id,
        );

        if (hashes_stored_in_db.length === 0) {
            return res.status(200).json(verified_body_array.data);
        }
        const hashes_as_string: Array<string> = [];
        const requests_to_insert: Array<request> = [];
        for (const link of hashes_stored_in_db) {
            requests_to_insert.push({
                id: "n/a",
                derivations_tenants_links: link.id,
                date: Date.now(),
                direction: "inbound",
                url: `/api/v1/cache/${link.tenants_id.name}/narinfo`,
            });
            hashes_as_string.push(link.derivations_id.cstorehash);
        }
        await new Requests().bulk_insert(requests_to_insert);

        const hashes_not_in_db: Array<string> = hashes_as_string.filter((x) => {
            return !verified_body_array.data.includes(x);
        });

        // Get the hashes not in the database
        return res.status(200).json(hashes_not_in_db);
    },
];
