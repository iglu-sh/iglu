/*
 * Response format:
 * Array<string>
 *
 * Return format:
 * Array<string>
 * */

import type { Request, Response } from "express";
import bodyParser from "express";
import Authentication from "../../../../../../shared/utils/rest/Authentication";
import Logger from "@/logger";
import MakeRestResponse from "../../../../../../shared/utils/rest/MakeResponse";
import Tenants from "../../../../../../shared/db/DAO/tenants";
import Derivation_tenant_link from "../../../../../../shared/db/DAO/derivation_tenant_link";
import IPFiltering from "../../../../../../shared/utils/rest/IPFiltering";

export const post = [
    IPFiltering(),
    Authentication(),
    bodyParser.json(),
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

        // Check if the BODY_ARRAY is an array of strings to make sure we do not pass bad data to the downstream functions
        const is_only_strings =
            BODY_ARRAY.filter((x) => {
                return typeof x !== "string";
            }).length === 0;
        if (!is_only_strings) {
            return res.status(400).json(
                MakeRestResponse(400, "Invalid Body", true, {
                    error_description: "The Request body is malformed",
                }),
            );
        } else {
            BODY_ARRAY as Array<string>;
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
        const hashes_stored_in_db = await new Derivation_tenant_link()
            .getByNixStoreHashes(BODY_ARRAY, tenant[0].id)
            .then((result) => {
                return result.map((item) => {
                    return item.derivations_id.cstorehash;
                });
            });

        if (hashes_stored_in_db.length === 0) {
            return res.status(200).json(BODY_ARRAY);
        }

        // Get the hashes not in the database
        const hashes_not_in_db = (BODY_ARRAY as Array<string>).filter((x) => {
            return !hashes_stored_in_db.includes(x);
        });
        return res.status(200).json(hashes_not_in_db);
    },
];
