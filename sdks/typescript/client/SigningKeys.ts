import type { signing_key } from "@iglu-sh/shared";
import { signing_keys_schema } from "@iglu-sh/shared/utils";
import z from "zod";
import Abstract from "./Abstract";

export default class SigningKeys extends Abstract {
    /**
     * @description Fetches the signing key your current api key is associated with
     * @returns {Promise<signing_key>}
     * @throws {IgluError | NotFoundError} All applicable Iglu Errors AND if you do not yet have a signing key associated with your api key a NotFoundError
     * */
    public async get(): Promise<signing_key> {
        const prepared_request = this.getCore().prepare_request(true, "GET");

        const result = await prepared_request.fetch(
            `${prepared_request.base_url}/api/v1/iglu/rest/keys/signing`,
            prepared_request.options,
        );

        return await this.getCore().process_response(result, signing_keys_schema);
    }

    /**
     * @description Get all signing keys associated with a tenant
     * @param {string} tenant_name The name of the tenant
     * @returns {Promise<Array<signing_key>>}
     * @throws {IgluError} All applicable Iglu Errors
     * */
    public async get_for_tenant(tenant_name: string): Promise<Array<signing_key>> {
        const prepared_request = this.getCore().prepare_request(true, "GET");

        const result = await prepared_request.fetch(
            `${prepared_request.base_url}/api/v1/iglu/rest/keys/signing/${tenant_name}`,
            prepared_request.options,
        );

        return await this.getCore().process_response(result, z.array(signing_keys_schema));
    }

    /**
     * @description Updates a signing key in a given tenant
     * @param {string} tenant_name The name of the tenant in which the key is in
     * @param {{id:string, name:string}} new_state The new state the public signing key should reflect (the id key is the signing key you want to update)
     * @returns {Promise<signing_key>}
     * @throws {IgluError} All applicable Iglu Errors
     * */
    public async update(
        tenant_name: string,
        new_state: { id: string; name: string },
    ): Promise<signing_key> {
        const prepared_request = this.getCore().prepare_request(true, "PATCH", "application/json");

        const result = await prepared_request.fetch(
            `${prepared_request.base_url}/api/v1/iglu/rest/keys/signing/${tenant_name}`,
            {
                ...prepared_request.options,
                body: JSON.stringify(new_state),
            },
        );

        return await this.getCore().process_response(result, signing_keys_schema);
    }

    /**
     * @description Deletes the signing key associated with your api key
     * @param {string} tenant_name The name of the tenant
     * @returns {Promise<void>}
     * @throws {IgluError} All applicable Iglu Errors
     * */
    public async delete(tenant_name: string): Promise<void> {
        const prepared_request = this.getCore().prepare_request(true, "DELETE");

        const result = await prepared_request.fetch(
            `${prepared_request.base_url}/api/v1/iglu/rest/keys/signing/${tenant_name}`,
            prepared_request.options,
        );

        await this.getCore().process_response(result, z.object({ information: z.string() }));
    }
}
