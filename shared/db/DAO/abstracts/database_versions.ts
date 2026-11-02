import type { database_version } from "../../../types/schema";
import type { DAO } from "../DAO";

export interface database_versions_abstract extends DAO<database_version> {
    get_latest(): Promise<database_version | null>;
}
