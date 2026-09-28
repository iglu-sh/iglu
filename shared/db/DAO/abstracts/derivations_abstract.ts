import type { derivation } from "../../../types/schema";
import type { DAO } from "../DAO";

export interface derivations_abstract extends DAO<derivation> {
    getByNixStoreHashes(paths: Array<string>): Promise<Array<derivation>>;
}
