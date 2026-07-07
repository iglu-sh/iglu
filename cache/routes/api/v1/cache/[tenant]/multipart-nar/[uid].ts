import { Uploads } from "@iglu-sh/shared/db";
import { Logger } from "@iglu-sh/shared/logger";
import { Authentication, IPFiltering, MakeRestResponse } from "@iglu-sh/shared/utils";
import type { Request, Response } from "express";
import bodyParser from "express";
import z from "zod";
import { S3 } from "@/shared/files/S3";
import { Configuration } from "@/shared/utils/cache";

const request_body_schema = z.object({
    contentMD5: z.string(),
});
export const post = [
    IPFiltering(),
    Authentication(),
    bodyParser.json(),
    async (req: Request, res: Response) => {
        Logger.debug("Got request to multipart-nar/[uid].ts");
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
                    error_details: "Your Request Body was malformed",
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
                    error_details: "Your Request Params were malformed",
                }),
            );
        }

        // Get the upload by ID
        let upload_url = `${process.env.HOSTNAME}/api/v1/iglu/upload/${TENANT_NAME}/${UID}?partNumber=${PART_NUMBER}`;
        const upload_element = await new Uploads().getById(UID);

        if (upload_element === null) {
            return res.status(404).json(
                MakeRestResponse(404, "Upload not found", true, {
                    error_details: "You were using an invalid Upload ID",
                }),
            );
        }

        if (upload_element.timeout < Date.now() / 1000) {
            return res.status(410).json(
                MakeRestResponse(410, "Gone", true, {
                    error_details: "This Upload ID is no longer valid (timed out)",
                }),
            );
        }

        // Update the element to use the md5-hash that this request has
        try {
            await new Uploads().update({
                ...upload_element,
                md5: validated_schema.contentMD5,
            });

            if (Configuration.getConfig().storage.storage_type === "s3") {
                if (!upload_element.s3_id) {
                    throw new Error(
                        "warn(routes::api::v1::cache::[tenant]::multipart-nar::[uid]): Upload Element was created without s3_id although it should have one attached to it",
                    );
                }
                upload_url = await S3.getUploadURL(
                    upload_element.tenants_id.id,
                    UID,
                    upload_element.s3_id,
                    parseInt(PART_NUMBER),
                    validated_schema.contentMD5,
                );
            }

            Logger.debug(`Resolving to upload url:${upload_url}`);

            return res.status(200).json({
                uploadUrl: upload_url,
            });
        } catch (e) {
            Logger.error(
                `Could not update to new md5 hash for Upload ID: ${upload_element.id}, error: ${e}`,
            );
            return res.status(500).json(
                MakeRestResponse(500, "Internal Server Error", true, {
                    error_details: "Iglu could not complete that request, try again later",
                }),
            );
        }
    },
];
