import type { upload } from "../../../types/schema";
import type { DAO } from "../DAO";

export interface uploads_abstract extends DAO<upload> {
    wipe(): Promise<void>;
}
