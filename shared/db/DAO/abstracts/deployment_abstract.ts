import type { deployment } from "@/db_types";
import type { DAO } from "../DAO";

export interface deployment_abstract extends DAO<deployment> {
    /**
     * @description Returns the **current** index of the newest deployment in the database (i.e: if you are inserting a new deployment you'll have to add +1 to that index)
     * @param {string} tenant_id The ID you are requesting the Index for
     * @returns {Promise<number>}
     * */
    getIndexForTenantDeployment(tenant_id: string): Promise<number>;
}
