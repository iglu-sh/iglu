import type { api_key, tenant } from "@iglu-sh/shared";
import { api_keys_schema, tenant_schema } from "@iglu-sh/shared/utils";
import { z } from "zod";
import Abstract from "./Abstract";
export class ApiKeys extends Abstract {
    /**
     * @description Fetches meta information (such as name and id) and available tenants for the token you provided when constructing the iglu client
     * @returns {Promise<{id:string, name:string, tenants:Array<string>}>}
     * @throws {IgluError} All applicable iglu errors
     * */
    public async get(): Promise<{ id: string; name: string; tenants: Array<tenant> }> {
        const prepared_request = this.getCore().prepare_request(true, "GET");

        const result = await prepared_request.fetch(
            `${prepared_request.base_url}/api/v1/iglu/rest/keys/auth`,
            prepared_request.options,
        );

        return await this.getCore().process_response(
            result,
            z.object({ id: z.uuid(), name: z.string(), tenants: z.array(tenant_schema) }),
        );
    }

    /**
     * @description Creates a new api key for the given tenants. CAREFULL: The new PLAINTEXT key will be shown once in the response of this request. It won't be shown afterwards.
     * @param {string} name The name of the new api key
     * @param {Array<string>} tenants The IDs of the tenants this api key should be authorized to access. This may only be IDs that your current API Key can access.
     * @returns {Promise<{id:string, name:string, key:string}>}
     * @throws {IgluError} All applicable iglu errors
     * */
    public async create(
        name: string,
        tenants: Array<string>,
    ): Promise<{ id: string; name: string; key: string }> {
        const prepared_request = this.getCore().prepare_request(true, "POST", "application/json");

        const result = await prepared_request.fetch(
            `${prepared_request.base_url}/api/v1/iglu/rest/keys/auth`,
            {
                ...prepared_request.options,
                body: JSON.stringify({
                    name: name,
                    tenants: tenants,
                }),
            },
        );

        return await this.getCore().process_response(
            result,
            z.object({ id: z.uuid(), name: z.string(), key: z.string() }),
        );
    }

    /**
     * @description Deletes the key that is CURRENTLY IN USE
     * @returns {Promise<void>}
     * @throws {IgluError} All applicable iglu errors
     * */
    public async delete(): Promise<void> {
        const prepared_request = this.getCore().prepare_request(true, "DELETE");

        const result = await prepared_request.fetch(
            `${prepared_request.base_url}/api/v1/iglu/rest/keys/auth`,
            {
                ...prepared_request.options,
            },
        );

        await this.getCore().process_response(result, z.object({ information: z.string() }));
    }

    /**
     * @description Fetch all API Keys for a given tenant
     * @param {string} tenant_name The name of the Tenant
     * @returns {Promise<Array<{id:string, api_keys_id:api_key, tenants_id:tenant}>>}
     * */
    public async get_for_tenant(
        tenant_name: string,
    ): Promise<Array<{ id: string; api_keys_id: api_key; tenants_id: tenant }>> {
        const prepared_request = this.getCore().prepare_request(true, "GET");

        const result = await prepared_request.fetch(
            `${prepared_request.base_url}/api/v1/iglu/rest/keys/auth/${tenant_name}`,
            {
                ...prepared_request.options,
            },
        );

        return await this.getCore().process_response(
            result,
            z.array(
                z.object({
                    id: z.string(),
                    api_keys_id: api_keys_schema,
                    tenants_id: tenant_schema,
                }),
            ),
        );
    }
}
