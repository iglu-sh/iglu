import bodyParser, { type Request, type Response } from "express";

/*
 * This endpoint accepts only GET requests from the Cachix Client
 * It is used to check authentication and check configuration for this tenant.
 *
 * Response type is in this schema:
 * Type: Application/JSON
 * Schema:
 * {
 *  githubUsername: string,
 *  isPublic: boolean,
 *  name: string,
 *  permission: string,
 *  preferredCompressionMethod: string,
 *  publicSigningKeys: Array<string>,
 *  uri: string,
 *  priority: number
 * }
 * */

export const get = [
    bodyParser.json(),
    async (req: Request, res: Response) => {
        const TENANT_NAME = req.params.tenant;

        if (!TENANT_NAME || Array.isArray(TENANT_NAME)) {
            return res.status(404).json({
                status_code: 404,
                status_message: "Not found",
                data: {
                    error_description: "This tenant was not found on this server.",
                },
            });
        }

        return res.status(200);
    },
];
