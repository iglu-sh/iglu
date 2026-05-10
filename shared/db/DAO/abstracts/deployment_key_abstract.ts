import type { deployment_key } from "../../../types/schema";
import type { DAO } from "../DAO";

export interface deployment_key_abstract extends DAO<deployment_key> {
    getByHash(hash: string): Promise<deployment_key | null>;
    getByNameAndTenant(name: string, tenant_id: string): Promise<Array<deployment_key>>;
}
