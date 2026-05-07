import z from "zod";

export const deploy_json_schema = z.object({
    agents: z.record(z.string(), z.string()),
    rollbackScripts: z.record(z.string(), z.string()).optional(),
});

export const deploy_activate_response = z.object({
    id: z.string(),
    agents: z.record(z.string(), z.string()),
});
