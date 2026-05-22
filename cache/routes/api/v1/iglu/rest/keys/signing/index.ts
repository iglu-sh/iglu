import { Api_keys, Signing_Keys } from "@iglu-sh/shared/db";
import { FilterFeatures, hashApiKey, MakeRestResponse } from "@iglu-sh/shared/utils";
import type { Request, Response } from "express";
import z from "zod";

const expected_header_schema = z.object({
    authorization: z.string(),
});

export const get = [
    FilterFeatures("rest"),
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

        const signing_key_for_api_key = await new Signing_Keys().getByApiKeyId(api_key.id);
        if (signing_key_for_api_key === null) {
            return res.status(404).json(
                MakeRestResponse(404, "Not found", true, {
                    error_details:
                        "Your API Key does not have a signing key associated with it. Try uploading one using cachix generate-key <tenant_name>",
                }),
            );
        }

        return res.status(200).json(
            MakeRestResponse(200, "Found", false, {
                ...signing_key_for_api_key,
                api_keys_id: {
                    ...signing_key_for_api_key.api_keys_id,
                    hash: "<omitted>",
                },
            }),
        );
    },
];
