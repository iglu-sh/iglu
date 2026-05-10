import type { tenant } from "../../../types/schema";
import type { DAO } from "../DAO";

export interface tenants_abstract extends DAO<tenant> {
    getByName(name: string): Promise<Array<tenant>>;
}
