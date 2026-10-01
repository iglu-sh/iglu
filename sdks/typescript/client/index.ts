import { Core } from "./Core";
import { Tenants } from "./Tenants";

export const CLIENT_VERSION = "v0.0.1";

export interface IgluOptions {
    baseUrl: string;
    token: string;
    timeoutMs?: number;
    maxRetries?: number;
    fetch?: typeof fetch;
}

export class Iglu {
    readonly tenants: Tenants;
    constructor(options: IgluOptions) {
        const core = new Core(options);
        this.tenants = new Tenants(core);
    }
}
