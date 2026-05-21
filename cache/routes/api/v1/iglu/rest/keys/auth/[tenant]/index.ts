import { Api_keys } from "@iglu-sh/shared/db";
import {
    Authentication,
    FilterFeatures,
    hashApiKey,
    IPFiltering,
    MakeRestResponse,
} from "@iglu-sh/shared/utils";
import type { Request, Response } from "express";
import z from "zod";

const expected_header_schema = z.object({
    authorization: z.string(),
});

export const get = [
    FilterFeatures("rest"),
    Authentication(),
    IPFiltering(),
    async (req: Request, res: Response) => {
        const parsed_headers = expected_header_schema.safeParse(req.headers);
        if (!parsed_headers.success || !parsed_headers.data.authorization.split(" ")[1]) {
            return res.status(403).json(
                MakeRestResponse(403, "Access Forbidden", true, {
                    error_details:
                        "You are not allowed to access this cache (no auth header presented)",
                }),
            );
        }

        const api_key = await new Api_keys().getByHash(
            hashApiKey(parsed_headers.data.authorization.split(" ")[1] as string),
        );
        if (api_key === null) {
            return res.status(401).json(
                MakeRestResponse(401, "Unauthorized", true, {
                    error_details:
                        "You are not allowed to access this tenant (API Key not recognized)",
                }),
            );
        }
    },
];
