import {z} from "zod"

const valid_build_states:string[] = ["created", "claimed", "starting", "running", "failed", "success", "aborted"]
export const controllerStateUpdateSchema = z.object({
    old_state: z.enum(valid_build_states),
    new_state: z.enum(valid_build_states),
    timestamp: z.date(),
    job_id: z.number(),
})