import type { api_key_tenant_link } from "@/db_types";
import type { DAO } from "../DAO";

export interface api_keys_tenants_links_abstract extends DAO<api_key_tenant_link> {
    getByApiKey(api_key_id: string): Promise<Array<api_key_tenant_link>>;

    getByTenantAndKey(
        api_key_id: string,
        tenant_id: string,
    ): Promise<Array<api_key_tenant_link> | null>;
}
