import { Access_rules } from "./Access_rules";
import { Core } from "./Core";
import { Derivations } from "./Derivations";
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
    readonly access_rules: Access_rules; 
    readonly derivations: Derivations
    constructor(options: IgluOptions) {
        const core = new Core(options);
        this.tenants = new Tenants(core);
        this.access_rules = new Access_rules(core)
        this.derivations = new Derivations(core)
    }
}
