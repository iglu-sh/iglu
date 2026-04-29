import type { access_rule } from "@/db_types";
import type { DAO } from "../DAO";

export interface access_rules_abstract extends DAO<access_rule> {
    getByIP(ip_address: string, tenant_id: string): Promise<Array<access_rule>>;
    getByTenant(tenant_id: string): Promise<Array<access_rule>>;
}
