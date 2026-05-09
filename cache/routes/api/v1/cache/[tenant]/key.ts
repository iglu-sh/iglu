import bodyParser, { type Request, type Response } from "express";
import z from "zod";
import { Logger } from "@iglu-sh/shared/logger";
import { Api_keys, Signing_Keys } from "@iglu-sh/shared/db";
import { hashApiKey } from "@iglu-sh/shared/utils";
import { Authentication, IPFiltering, MakeRestResponse } from "@iglu-sh/shared/utils";

/*
 *
 * */

const request_schema = z.object({
    publicKey: z.string(),
});

export const post = [
    IPFiltering(),
    Authentication(),
    bodyParser.json(),
    async (req: Request, res: Response) => {
        // As the user is already authenticated here, we only need to check a few things
        let validated_schema: {
            publicKey: string;
        };
        try {
            const parse_results = request_schema.safeParse(req.body);
            if (!parse_results.success) {
                throw new Error("Did not successfully validate key upload schema");
            }
            validated_schema = parse_results.data;
        } catch (e) {
            Logger.debug(`Did not successfully validate key upload schema: ${e}`);
            return res.status(400).json(
                MakeRestResponse(400, "Malformed Body", true, {
                    error_details: "Malformed Request Body (publicKey missing)",
                }),
            );
        }

        const auth_header = req.headers.authorization as string;
        const api_key_header = auth_header.split(" ")[1] as string;
        
        const api_key_db = await new Api_keys().getByHash(hashApiKey(api_key_header)) as api_key;
        //Check if the api_key has a signing key assigned already
        const signing_key_db = await new Signing_Keys().getByApiKeyId(api_key_db.id);
        if (signing_key_db !== null) {
            // Delete that signing key from the database
            try {
                await new Signing_Keys().delete(signing_key_db);
            } catch (e) {
                Logger.error(`Could not delete existing signing key: ${e}`);
                return res.status(500).json(
                    MakeRestResponse(500, "Internal Server Error", true, {
                        error_details:
                            "Iglu encountered an error while trying to update your signing key, try again later or check the logs",
                    }),
                );
            }
        }

        // Insert the signing key into the database
        try {
            await new Signing_Keys().insert({
                id: "n/a",
                key: validated_schema.publicKey,
                api_keys_id: api_key_db,
                name: "Key uploaded by cachix",
            });
        } catch (e) {
            Logger.error(`Could not insert signing key: ${e}`);
            return res.status(500).json(
                MakeRestResponse(500, "Internal Server Error", true, {
                    error_details:
                        "Iglu encountered an error while trying to update your signing key, try again later or check the logs",
                }),
            );
        }

        return res.status(200).json(
            MakeRestResponse(200, "Success", false, {
                message: "New Signing Key recorded successfully",
            }),
        );
    },
];
