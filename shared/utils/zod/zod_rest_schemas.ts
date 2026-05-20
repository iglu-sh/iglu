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

export const access_rules_rest_schema = z.object({
    ip_block: z.string(),
    priority: z.number(),
    action: z.enum(["drop", "accept"]),
    name: z.string(),
});
