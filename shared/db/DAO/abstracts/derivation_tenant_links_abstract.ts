import type { derivation_tenant_link } from "@/db_types";
import type { DAO } from "../DAO";

export interface derivation_tenant_links_abstract extends DAO<derivation_tenant_link> {
    getByNixStoreHashes(
        paths: Array<string>,
        tenant_id: string,
    ): Promise<Array<derivation_tenant_link>>;
}
