import type { Request, Response } from "express";
import bodyParser from "express";
import Authentication from "../../../../../../../shared/utils/rest/Authentication";
import z from "zod";
import Logger from "@/logger";
import MakeRestResponse from "../../../../../../../shared/utils/rest/MakeResponse";
import Uploads from "../../../../../../../shared/db/DAO/uploads";
const request_body_schema = z.object({
    contentMD5: z.string(),
});
export const post = [
    Authentication(),
    bodyParser.json(),
    async (req: Request, res: Response) => {
        let validated_schema: {
            contentMD5: string;
        };
        try {
            const schema = request_body_schema.safeParse(req.body);
            if (schema.success === false) {
                throw new Error("Zod schema validation failed");
            }
            validated_schema = schema.data;
        } catch (e) {
            Logger.debug(`Initialization of Cachix Upload failed due to: No contentMD5 key (${e})`);
            return res.status(400).json(
                MakeRestResponse(400, "Malformed Body", true, {
                    error_description: "Your Request Body was malformed",
                }),
            );
        }
        const TENANT_NAME = req.params.tenant;
        const UID = req.params.uid;
        const PART_NUMBER = req.query.partNumber;
        if (
            !TENANT_NAME ||
            !UID ||
            !PART_NUMBER ||
            typeof TENANT_NAME !== "string" ||
            typeof UID !== "string" ||
            typeof PART_NUMBER !== "string"
        ) {
            return res.status(400).json(
                MakeRestResponse(400, "Malformed Request", true, {
                    error_description: "Your Request Params were malformed",
                }),
            );
        }

        // Get the upload by ID
        const upload_element = await new Uploads().getById(UID);

        if (upload_element === null) {
            return res.status(404).json(
                MakeRestResponse(404, "Upload not found", true, {
                    error_description: "You were using an invalid Upload ID",
                }),
            );
        }

        // Update the element to use the md5-hash that this request has
        try {
            await new Uploads().update({
                ...upload_element,
                md5: validated_schema.contentMD5,
            });
        } catch (e) {
            Logger.error(
                `Could not update to new md5 hash for Upload ID: ${upload_element.id}, error: ${e}`,
            );
            return res.status(500).json(
                MakeRestResponse(500, "Internal Server Error", true, {
                    error_description: "Iglu could not complete that request, try again later",
                }),
            );
        }

        return res.status(200).json({
            uploadUrl: `${process.env.HOSTNAME}/api/v1/iglu/upload/${TENANT_NAME}/${UID}?partNumber=${PART_NUMBER}`,
        });
    },
];
