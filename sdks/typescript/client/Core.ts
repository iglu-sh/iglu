import type { IgluOptions } from "./index";
import { CLIENT_VERSION } from "./index";

export class Core {
    private readonly baseUrl: string;
    private readonly token: string;
    private readonly timeoutMs: number;
    //private readonly _maxRetries: number;
    private readonly fetch: typeof fetch;

    constructor(config: IgluOptions) {
        this.baseUrl = config.baseUrl;
        this.token = config.token;
        this.timeoutMs = config.timeoutMs ?? 9000;
        //this._maxRetries = config.maxRetries ?? 3;
        this.fetch = config.fetch ?? fetch;
    }

    /**
     * @description Returns information needed for a fetch request in downstream classes
     * @param {boolean} needs_authentication Determines wether or not a request must be authenticated against the iglu sdk (i.e if  the Auhtorization Header must be set)
     * @param {string} method Controls which type of request is going to be made. This can later be overwritten by the using classes in how they construct their request.
     * @returns {{method: string, headers: Headers, redirect: 'follow', signal: AbortSignal}}
     * */
    public prepare_request(
        needs_authentication: boolean,
        method: string,
    ): {
        fetch: typeof fetch;
        base_url: string;
        options: {
            method: string;
            headers: Headers;
            redirect: "follow";
            signal: AbortSignal;
        };
    } {
        const request_headers = new Headers();
        request_headers.append("User-agent", `Iglu Typescript SDK ${CLIENT_VERSION}`);
        if (needs_authentication) {
            request_headers.append("Authorization", this.token);
        }

        return {
            fetch: this.fetch,
            base_url: this.baseUrl,
            options: {
                method: method,
                headers: request_headers,
                redirect: "follow",
                signal: AbortSignal.timeout(this.timeoutMs),
            },
        };
    }
}
