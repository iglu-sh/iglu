import { z } from "zod";
import { tenant_schema } from "../zod_db_schemas";

export const get_response = z.object({
    id: z.uuid(),
    name: z.string(),
    tenants: z.array(tenant_schema),
});
