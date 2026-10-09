import type { access_rule } from "@iglu-sh/shared";
import { access_rule_schema } from "@iglu-sh/shared/utils";
import type { access_rules_rest_schema } from "@iglu-sh/shared/utils/zod/zod_rest_schemas";
import { z } from "zod";
import { GeneralError } from "../errors";
import Abstract from "./Abstract";

export class Access_rules extends Abstract {
    /**
     * @description Get a specific access rule in a specific tenant
     * @param {string} tenant_name The tenant you want to request for
     * @param {string} access_rule_id The access rule you want to access
     * @returns {Promise<access_rule>}
     * @throws {IgluError} All applicable iglu errors
     * */
    public async get(tenant_name: string, access_rule_id: string): Promise<access_rule> {
        const prepared_request = this.getCore().prepare_request(true, "GET");

        const result = await prepared_request.fetch(
            `${prepared_request.base_url}/api/v1/iglu/rest/tenants/${tenant_name}/access_rules/${access_rule_id}`,
            prepared_request.options,
        );

        return await this.getCore().process_response(result, access_rule_schema);
    }

    /**
     * @description Search for an access rule, if you'd like to get all access rules for a tenant, provide name as an empty string. You must provide either name or ip
     * @param {string} tenant_name The tenant you want to search in
     * @param {string} [name] The name of the access rule you want to get.
     * @param {string} [ip] Any IP you want to check access rules for. This may be any IPv4 IP
     * @returns {Promise<access_rule>}
     * @throws {IgluError} All applicable iglu errors
     * */
    public async search(
        tenant_name: string,
        name?: string,
        ip?: string,
    ): Promise<Array<access_rule>> {
        if (name === undefined && !ip) {
            throw new GeneralError("Invalid Param definition", -1, {
                error_details:
                    "You must provide either ip, name or both but you cannot leave both empty",
                additional_information:
                    "If you want a complete list of access_rules, provide the name parameter as an empty string",
            });
        }

        const prepared_request = this.getCore().prepare_request(true, "GET");

        const result = await prepared_request.fetch(
            `${prepared_request.base_url}/api/v1/iglu/rest/tenants/${tenant_name}/access_rules/search?${name !== undefined ? `&name=${name}` : ""}${ip ? `ip=${ip}` : ""}`,
            prepared_request.options,
        );

        return await this.getCore().process_response(result, z.array(access_rule_schema));
    }

    /**
     * @description Create a new access rule.
     * @param {string} tenant_name The tenant you want to create the access rule for
     * @param {z.infer<typeof access_rules_rest_schema>} rule The rule to create
     * @param {boolean} [confirm] Set this to true if you want to suppress any warnings about an access rule that would lock you out (iglu usually tries to protect you against locking you out of a tenant you have access to by throwing a 4xx error, settings this flag disables that error)
     * @returns {Promise<access_rule>}
     * @throws {IgluError} All applicable iglu errors
     * */
    public async create(
        tenant_name: string,
        rule: z.infer<typeof access_rules_rest_schema>,
        confirm: boolean = false,
    ): Promise<access_rule> {
        const prepared_request = this.getCore().prepare_request(true, "POST", "application/json");

        const result = await prepared_request.fetch(
            `${prepared_request.base_url}/api/v1/iglu/rest/tenants/${tenant_name}/access_rules${confirm ? "?confirm=true" : ""}`,
            {
                ...prepared_request.options,
                body: JSON.stringify(rule),
            },
        );

        return await this.getCore().process_response(result, access_rule_schema);
    }

    /**
     * @description Delete a given access rule
     * @param {string} tenant_name The tenant you want to delete the access rule from
     * @param {string} access_rule_id The id of the rule you want to delete
     * @returns {Promise<void>}
     * @throws {IgluError} All applicable iglu errors
     * */
    public async delete(tenant_name: string, access_rule_id: string): Promise<void> {
        const prepared_request = this.getCore().prepare_request(true, "DELETE");

        const result = await prepared_request.fetch(
            `${prepared_request.base_url}/api/v1/iglu/rest/tenants/${tenant_name}/access_rules/${access_rule_id}`,
            {
                ...prepared_request.options,
            },
        );

        await this.getCore().process_response(result, z.object({ information: z.string() }));
    }

    /**
     * @description Update a given access rule to a new state
     * @param {string} tenant_name The tenant you want to update an access rule in
     * @param {string} access_rule_id The id of the rule you want to delete
     * @param {z.infer<access_rules_rest_schema>} new_state The state you want to update to
     * @returns {Promise<void>}
     * @throws {IgluError} All applicable iglu errors
     * */
    public async update(
        tenant_name: string,
        access_rule_id: string,
        new_state: z.infer<typeof access_rules_rest_schema>,
    ): Promise<access_rule> {
        const prepared_request = this.getCore().prepare_request(true, "PATCH", "application/json");

        const result = await prepared_request.fetch(
            `${prepared_request.base_url}/api/v1/iglu/rest/tenants/${tenant_name}/access_rules/${access_rule_id}`,
            {
                ...prepared_request.options,
                body: JSON.stringify(new_state),
            },
        );

        return await this.getCore().process_response(result, access_rule_schema);
    }
}
