import type { tenant } from "@/shared/types";
import { base_response_schema, tenant_schema } from "../../zod";
import type { Client } from "../Client";

export class Tenant {
    private client: Client;
    constructor(client: Client) {
        this.client = client;
    }

    /**
     * @description Updates a tenant to a new state (given in the new_state param). IMPORTANT: The name field in your new_state is used as the identifier on which tenant to update, so if you need to change the name of a tenant, make sure to set old_name as well.
     * @param {tenant} new_state The new state of the tenant. Make sure that no name change occurs in this object. Should you need to update the name of a cache, set old_name instead
     * @param {string | undefined} old_name The old name of the tenant. Only set if you need to change the name of a tenant.
     * @returns {Promise<tenant>}
     * @throws {Error} If Iglu returns a non 2xx code OR is_error is set to true
     * */
    public async update(new_state: tenant, old_name?: string): Promise<tenant> {
        const result = await fetch(
            `${this.client.getConfig().hostname}/api/v1/iglu/rest/tenants/${old_name ? old_name : new_state.name}/`,
            this.client.getRequestOptions("PATCH", JSON.stringify(new_state), [
                { key: "content-type", content: "application/json" },
            ]),
        ).then((response) => response.json());
        const parsed_result = base_response_schema.safeParse(result);
        if (!parsed_result.success || parsed_result.data.status_code > 399) {
            throw new Error(
                `Iglu returned a non-zero access code. The error iglu returned was: ${parsed_result.data?.is_error ? parsed_result.data.data.error_details : "No Error Information available"} (Code: ${parsed_result.data?.status_code})`,
            );
        }

        const data_result = tenant_schema.safeParse(parsed_result.data.data);
        if (!data_result.success) {
            throw new Error(
                "Iglu returned an invalid response. Some or all expected Keys were missing!",
            );
        }

        return data_result.data;
    }
}
