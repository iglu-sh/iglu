import type { openapi_definiton } from "@iglu-sh/shared";
import { MakeRestResponse } from "@iglu-sh/shared/utils";
import { base_response_schema } from "@iglu-sh/shared/utils/zod/zod_rest_schemas";
import type { Request, Response } from "express";
import z from "zod";

export const openapi: openapi_definiton = {
    meta: {
        path: "/api/v1/iglu/healthcheck",
        authentication_required: false,
        feature_filtered: false,
        tags: ["iglu"],
    },
    routes: [
        {
            method: "get",
            description: "Endpoint to check if Iglu is up and running",
            summary: "Healthcheck",
            responses: {
                200: {
                    description: "Informational response if Iglu is running",
                    content: {
                        "application/json": {
                            schema: base_response_schema.extend(
                                z.object({
                                    is_error: z.literal(false),
                                    data: z.object({
                                        information: z.literal("Healthy"),
                                    }),
                                }).shape,
                            ),
                        },
                    },
                },
            },
        },
    ],
};

export const get = [
    async (_req: Request, res: Response) => {
        return res.status(200).json(
            MakeRestResponse(200, "Success", false, {
                information: "Healthy",
            }),
        );
    },
];
