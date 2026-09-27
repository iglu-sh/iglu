import { z } from "zod";
import { error_response_schema } from "./zod_rest_schemas";

// Openapi specs for shared/utils/rest/Authentication.ts
export const openapi_authentication_extra_responses = {
    responses: {
        401: {
            description: "The key you were using is not recognized",
            content: {
                "application/json": {
                    schema: error_response_schema,
                },
            },
        },
        403: {
            description:
                "Forbidden - No authorization, either you didn't provide an authorization header or your header is not in the Bearer format",
            content: {
                "application/json": { schema: error_response_schema },
            },
        },
        404: {
            description: "The requested tenant does not exist on this server",
            content: {
                "application/json": { schema: error_response_schema },
            },
        },
    },
};

export const openapi_authentication_extra_meta = {
    headers: z.object({
        authorization: z.string(),
        "user-agent": z.string(),
    }),
};
