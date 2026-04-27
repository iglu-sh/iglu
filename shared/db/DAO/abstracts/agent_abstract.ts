import type { agent } from "@/db_types";
import type { DAO } from "../DAO";

export interface agent_abstract extends DAO<agent> {
    getByNameAndTenant(agent_name: string, tenant: string): Promise<Array<agent>>;
}
