import type { request } from "@/db_types";
import type { DAO } from "../DAO";

export interface requests_abstract extends DAO<request> {
    getLatestRequestForLink(link_id: string): Promise<request | null>;
    bulk_insert(requests_array: Array<request>): Promise<void>;
    removeAllForLink(link_id: string): Promise<void>;
}
