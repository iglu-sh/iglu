import { ZodObject, z } from "zod";
import { error_response_schema } from "./zod_rest_schemas";
export const zod_openapi_definition = z.object({
    meta: z.object({
        path: z.string(),
        authentication_required: z.boolean(),
        feature_filtered: z.boolean(),
        tags: z.array(z.string()),
    }),
    routes: z.array(
        z.object({
            method: z.enum(["get", "post", "patch", "put", "delete", "ws"]),
            description: z.string(),
            summary: z.string(),
            request: z
                .object({
                    params: z
                        .custom<ZodObject>((v) => v instanceof ZodObject, {
                            message: "Expected a Zod object schema",
                        })
                        .optional(),
                    headers: z
                        .custom<ZodObject>((v) => v instanceof ZodObject, {
                            message: "Expected a Zod object schema",
                        })
                        .optional(),
                    body: z.unknown().optional(),
                    query: z.unknown().optional(),
                })
                .optional(),
            responses: z.record(
                z.number(),
                z.object({
                    description: z.string(),
                    content: z.record(
                        z.string(),
                        z.object({
                            schema: z.unknown(),
                        }),
                    ),
                }),
            ),
        }),
    ),
});

export const extra_feature_responses = {
    503: {
        description: "Returned if the feature this route is part of is not enabled",
        content: {
            "application/json": {
                schema: error_response_schema,
            },
        },
    },
};
