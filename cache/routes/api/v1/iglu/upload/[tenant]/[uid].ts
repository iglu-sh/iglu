import { createHash } from "node:crypto";
import { Writable } from "node:stream";
import { Uploads } from "@iglu-sh/shared/db";
import { Filesystem } from "@iglu-sh/shared/files";
import { Logger } from "@iglu-sh/shared/logger";
import { IPFiltering, MakeRestResponse } from "@iglu-sh/shared/utils";
import type { Request, Response } from "express";
import z from "zod";

const params_schema = z.object({
    tenant: z.string(),
    uid: z.string(),
});
const query_schema = z.object({
    partNumber: z.string(),
});

export const put = [
    IPFiltering(),
    async (req: Request, res: Response) => {
        Logger.debug("Got request to upload endpoint");
        let verified_params: {
            tenant: string;
            uid: string;
        };
        let verified_query: {
            partNumber: string;
        };
        try {
            const params = params_schema.safeParse(req.params);
            const query = query_schema.safeParse(req.query);
            if (!params.success || !query.success) {
                throw new Error("Invalid query or params");
            }
            verified_params = params.data;
            verified_query = query.data;
        } catch (e) {
            Logger.debug(`Wasn't able to verify params or query in upload request, ${e}`);
            return res.status(400).json(
                MakeRestResponse(400, "Malformed Arguments", true, {
                    error_description: "Your Request Arguments were malformed",
                }),
            );
        }

        // Fetch the upload this is referring to
        const upload = await new Uploads().getById(verified_params.uid);

        if (!upload) {
            return res.status(404).json(
                MakeRestResponse(404, "Not found", true, {
                    error_description: "You are using an outdated or non existent Upload ID",
                }),
            );
        }
        Logger.debug("Redirecting Request to stream");

        // biome-ignore lint/suspicious/noExplicitAny : This chunk Array is a binary stream data, it is not used after this
        const chunks: any[] = [];
        const writeable_request_stream = new Writable({
            //biome-ignore lint/correctness/noUnusedFunctionParameters: loaded with "onload" in html
            write(chunk, encoding, callback) {
                chunks.push(chunk);
                callback();
            },
        });

        req.pipe(writeable_request_stream);

        writeable_request_stream.on("finish", async () => {
            const buffer_to_store = Buffer.concat(chunks);
            const buffer_md5_hash = createHash("md5").update(buffer_to_store).digest("base64");
            if (buffer_md5_hash !== upload.md5) {
                Logger.debug(`Corrupted Nar upload with ID ${upload.id}`);
                return res.status(400).json(
                    MakeRestResponse(400, "Unacceptable", true, {
                        error_description:
                            "The upload got corrupted, try again (Md5 Hash mismatch)",
                    }),
                );
            }

            try {
                await new Filesystem().store(
                    upload.tenants_id.id,
                    `${upload.id}.part-${verified_query.partNumber}`,
                    buffer_to_store,
                );
            } catch (e) {
                Logger.error(`Error while writing to disk: ${e}`);
                return res.status(500).json(
                    MakeRestResponse(500, "Internal Server Error", true, {
                        error_description: "Iglu could not direct your request. Please try again",
                    }),
                );
            }
            return res.status(200).json(
                MakeRestResponse(200, "Success", false, {
                    msg: "Uploaded Successfully",
                }),
            );
        });

        writeable_request_stream.on("error", async () => {
            return res.status(500).json(
                MakeRestResponse(500, "Error in request stream", true, {
                    error_description: "Iglu could not read the request stream, please try again",
                }),
            );
        });
    },
];
