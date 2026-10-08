import type { derivation_tenant_link } from "@iglu-sh/shared";
import { derivations_tenants_links_schema } from "@iglu-sh/shared/utils";
import { z } from "zod";
import Abstract from "./Abstract";

export class Derivations extends Abstract {
    /**
     * @description Get details of a stored derivation
     * @param {string} tenant_name The name of the tenant you want to search
     * @param {string} derivation_id The id of the derivation you want to fetch information for
     * @returns {Promise<derivation>}
     * @throws {IgluError} All applicable iglu errors
     * */
    public async get(tenant_name: string, derivation_id: string): Promise<derivation_tenant_link> {
        const prepared_request = this.getCore().prepare_request(true, "GET");

        const result = await prepared_request.fetch(
            `${prepared_request.base_url}/api/v1/iglu/rest/tenants/${tenant_name}/derivations/${derivation_id}`,
            prepared_request.options,
        );

        return await this.getCore().process_response(result, derivations_tenants_links_schema);
    }

    /**
     * @description Search for a stored derivation. You can either provide a nix store hash in the "search_term" or a uuid.
     * @param {string} tenant_name The name of the tenant you want to search
     * @param {string} search_term Either a nix store hash or an iglu derivation uuid
     * @returns {Promise<Array<derivation_tenant_link>>}
     * @throws {IgluError} All applicable iglu errors
     * */
    public async search(
        tenant_name: string,
        search_term: string,
    ): Promise<Array<derivation_tenant_link>> {
        const prepared_request = this.getCore().prepare_request(true, "GET");

        const result = await prepared_request.fetch(
            `${prepared_request.base_url}/api/v1/iglu/rest/tenants/${tenant_name}/derivations/search?query=${search_term}`,
            prepared_request.options,
        );

        return await this.getCore().process_response(
            result,
            z.array(derivations_tenants_links_schema),
        );
    }

    /**
     * @description Delete a stored derivation.
     * @param {string} tenant_name The name of the tenant you want to delete in
     * @param {string} derivation_id The derivation you want to delete
     * @returns {Promise<void>}
     * @throws {IgluError} All applicable iglu errors
     * */
    public async delete(tenant_name: string, derivation_id: string): Promise<void> {
        const prepared_request = this.getCore().prepare_request(true, "DELETE");

        const result = await prepared_request.fetch(
            `${prepared_request.base_url}/api/v1/iglu/rest/tenants/${tenant_name}/derivations/${derivation_id}`,
            prepared_request.options,
        );

        await this.getCore().process_response(result, z.object({ information: z.string() }));
    }

    /**
     * @description Pin or unpin a given derivation (i.e save it from being garbage collected)
     * @param {string} tenant_name The name of the tenant the derivation is in
     * @param {string} derivation_id The derivation you want to pin or unpin
     * @returns {Promise<void>}
     * @throws {IgluError} All applicable iglu errors
     * */
    public async pin(tenant_name: string, derivation_id: string): Promise<void> {
        const prepared_request = this.getCore().prepare_request(true, "GET");

        const result = await prepared_request.fetch(
            `${prepared_request.base_url}/api/v1/iglu/rest/tenants/${tenant_name}/derivations/${derivation_id}/pin`,
            prepared_request.options,
        );

        await this.getCore().process_response(result, z.object({ information: z.string() }));
    }
}
