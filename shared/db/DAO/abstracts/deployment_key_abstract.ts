import type { deployment_key } from "@/db_types";
import type { DAO } from "../DAO";

export interface deployment_key_abstract extends DAO<deployment_key> {
    getByHash(hash: string): Promise<deployment_key | null>;
}
