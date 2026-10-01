import { AuthenticationError } from "../errors";
import type { Core } from "./Core";

export class Tenants {
    constructor(private core: Core) {}

    public async get(name: string) {
        const prepared_request = this.core.prepare_request(true, "GET");

        const result = await prepared_request.fetch(
            `${prepared_request.base_url}/api/v1/iglu/rest/tenants/${name}`,
        );
        if (result.status === 401 || result.status === 403) {
            throw new AuthenticationError(result.statusText, result.status, {
                error_details: "test",
                additional_information: "This is a test",
            });
        }
        console.log(result);
    }
}
