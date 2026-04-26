import type { api_key } from "@/db_types";
import type { DAO } from "../DAO";

export interface api_key_abstract extends DAO<api_key> {
    getByHash(to_find: string): Promise<api_key | null>;
}
