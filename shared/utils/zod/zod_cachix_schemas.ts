import z from "zod";

export const deploy_json_schema = z.object({
    agents: z.record(z.string(), z.string()),
    rollbackScripts: z.record(z.string(), z.string()).optional(),
});
