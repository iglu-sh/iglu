import z from "zod";

export const error_response_schema = z.object({
    status_code: z.number(),
    status_message: z.string(),
    is_error: z.boolean(),
    data: z.object({
        error_details: z.string(),
    }),
    timestamp: z.number(),
});

export const base_response_schema = z.object({
    status_code: z.number(),
    status_message: z.string(),
    is_error: z.boolean(),
    data: z.object(),
    timestamp: z.number(),
});
