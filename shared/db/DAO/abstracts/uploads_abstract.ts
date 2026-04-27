import type { upload } from "@/db_types";
import type { DAO } from "../DAO";

export interface uploads_abstract extends DAO<upload> {
    wipe(): Promise<void>;
}
