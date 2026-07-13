import type { tenant } from "@iglu-sh/shared";
import { base_response_schema, get_response } from "../../zod/rest";
import type { Client } from "../Client";

export class Auth {
    private client: Client;
    constructor(client: Client) {
        this.client = client;
    }

    /**
     * @description Returns all tenant ids this key has access too
     * @returns {Promise<{id:string, name:string, tenants: Array<tenant>}>}
     * @throws {Error} If Iglu returns a non 2xx code
     * */
    public async getAllowedTenants(): Promise<{
        id: string;
        name: string;
        tenants: Array<tenant>;
    }> {
        const result = await fetch(
            `${this.client.getConfig().hostname}/api/v1/iglu/rest/keys/auth`,
            this.client.getRequestOptions("GET"),
        ).then((response) => response.json());
        const parsed_result = base_response_schema.safeParse(result);
        if (!parsed_result.success || parsed_result.data.status_code > 399) {
            throw new Error(
                `Iglu returned a non-zero access code. The error iglu returned was: ${parsed_result.data?.is_error ? parsed_result.data.data.error_details : "No Error Information available"} (Code: ${parsed_result.data?.status_code})`,
            );
        }

        const data_result = get_response.safeParse(parsed_result.data.data);
        if (!data_result.success) {
            throw new Error(
                "Iglu returned an invalid response. Some or all expected Keys were missing!",
            );
        }

        return data_result.data;
    }
}
