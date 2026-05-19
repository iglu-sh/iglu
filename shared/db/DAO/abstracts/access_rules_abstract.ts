import type { access_rule } from "../../../types/schema";
import type { DAO } from "../DAO";

export interface access_rules_abstract extends DAO<access_rule> {
    getByIP(ip_address: string, tenant_id: string, all: boolean): Promise<Array<access_rule>>;
    getByTenant(tenant_id: string, all: boolean): Promise<Array<access_rule>>;
    getByTenantAndName(name: string, tenant: string): Promise<Array<access_rule>>;
    getByTenantAndNameAndIP(
        name: string,
        tenant: string,
        ip_address: string,
    ): Promise<Array<access_rule>>;
}
