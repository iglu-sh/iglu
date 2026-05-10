import type { agent } from "../../../types/schema";
import type { DAO } from "../DAO";

export interface agent_abstract extends DAO<agent> {
    getByNameAndTenant(agent_name: string, tenant: string): Promise<Array<agent>>;
}
