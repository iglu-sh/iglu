import bodyParser, { type Request, type Response } from "express";
import Authentication from "../../../../../../shared/utils/rest/Authentication";
import z from "zod";
import Logger from "@/logger";
import MakeRestResponse from "../../../../../../shared/utils/rest/MakeResponse";
import Api_keys from "../../../../../../shared/db/DAO/api_key";
import Signing_Keys from "../../../../../../shared/db/DAO/signing_keys";

/*
 *
 * */

const request_schema = z.object({
    publicKey: z.string(),
});

export const post = [
    bodyParser.json(),
    Authentication(),
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
                    error_description: "Malformed Request Body (publicKey missing)",
                }),
            );
        }

        const auth_header = req.headers.authorization;
        if (!auth_header) {
            return res.status(403).json(
                MakeRestResponse(403, "Forbidden - No autorization", true, {
                    error_description:
                        "You do not have a authorization header set, or your Header is not in the Bearer format. This ressource is not available without one",
                }),
            );
        }
        const api_key_header = auth_header.split(" ")[1];
        if (!api_key_header) {
            return res.status(401).json(
                MakeRestResponse(401, "Unauthorized", true, {
                    error_description: "This key is not recognized",
                }),
            );
        }
        const api_key_db = await new Api_keys().getByHash(api_key_header);
        if (api_key_db === null) {
            return res.status(401).json(
                MakeRestResponse(401, "Unauthorized", true, {
                    error_description: "This key is not recognized",
                }),
            );
        }
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
                        error_description:
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
                    error_description:
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
