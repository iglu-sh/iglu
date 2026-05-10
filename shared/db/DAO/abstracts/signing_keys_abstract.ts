import type { signing_key } from "../../../types/schema";
import type { DAO } from "../DAO";

export interface signing_keys_abstract extends DAO<signing_key> {
    getByApiKeyId(key_id: string): Promise<signing_key | null>;
    getByTenant(tenant_id: string): Promise<Array<signing_key>>;
}
