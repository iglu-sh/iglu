import type { tenant } from "@/db_types";
import type { DAO } from "../DAO";

export interface tenants_abstract extends DAO<tenant> {
    getByName(name: string): Promise<Array<tenant>>;
}
