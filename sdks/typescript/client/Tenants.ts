import type { tenant } from "@iglu-sh/shared";
import { tenant_schema } from "@iglu-sh/shared/utils";
import { z } from "zod";
import Abstract from "./Abstract";

export class Tenants extends Abstract {
    /**
     * @description Get details of a given tenant
     * @param {string} name The EXACT name of the tenant you want to access
     * @returns {Promise<tenant>}
     * @throws {IgluError} All applicable iglu errors
     * */
    public async get(name: string): Promise<tenant> {
        const prepared_request = this.getCore().prepare_request(true, "GET");

        const result = await prepared_request.fetch(
            `${prepared_request.base_url}/api/v1/iglu/rest/tenants/${name}`,
            prepared_request.options,
        );

        return await this.getCore().process_response(result, tenant_schema);
    }

    /**
     * @description Search for a tenant. If you provide an empty string, all tenants you have access to will be returned
     * @param {string} name The rough name you want to search. If an empty string is provided, all tenants you have access to will be returned
     * @returns {Promise<Array<tenant>>}
     * @throws {IgluError} All applicable iglu errors
     * */
    public async search(name: string): Promise<Array<tenant>> {
        const prepared_request = this.getCore().prepare_request(true, "GET");

        const result = await prepared_request.fetch(
            `${prepared_request.base_url}/api/v1/iglu/rest/tenants/search?query=${name}`,
            prepared_request.options,
        );

        return await this.getCore().process_response(result, z.array(tenant_schema));
    }

    /**
     * @description Create a new tenant
     * @param {tenant} tenant_to_create The tenant you want to create. The ID Key will be ignored but must be provided to adhere to the tenant schema
     * @returns {Promise<Array<tenant>>}
     * @throws {IgluError} All applicable iglu errors
     * */
    public async create(tenant_to_create: tenant) {
        const prepared_request = this.getCore().prepare_request(true, "POST", "application/json");
        const result = await prepared_request.fetch(
            `${prepared_request.base_url}/api/v1/iglu/rest/tenants`,
            {
                ...prepared_request.options,
                body: JSON.stringify(tenant_to_create),
            },
        );

        return await this.getCore().process_response(result, tenant_schema);
    }

    /**
     * @description Delete a tenant
     * @param {string} name The name of the tenant you want to delete
     * @returns {Promise<void>}
     * @throws {IgluError} All applicable iglu errors
     * */
    public async delete(name: string) {
        const prepared_request = this.getCore().prepare_request(true, "DELETE");
        const result = await prepared_request.fetch(
            `${prepared_request.base_url}/api/v1/iglu/rest/tenants/${name}`,
            {
                ...prepared_request.options,
            },
        );

        await this.getCore().process_response(result, z.object({ information: z.string() }));
    }

    /**
     * @description Update a tenant
     * @param {string} name The name of the tenant to update
     * @param {tenant} new_state The state the given tenant should be updated to
     * @returns {tenant} New state of the tenant on the server
     * @throws {IgluError} All applicable iglu errors
     * */
    public async update(name: string, new_state: tenant): Promise<tenant> {
        const prepared_request = this.getCore().prepare_request(true, "PATCH", "application/json");
        const result = await prepared_request.fetch(
            `${prepared_request.base_url}/api/v1/iglu/rest/tenants/${name}`,
            {
                ...prepared_request.options,
                body: JSON.stringify(new_state),
            },
        );

        return await this.getCore().process_response(result, tenant_schema);
    }
}
