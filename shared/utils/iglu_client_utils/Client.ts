export type client_options = {
    hostname: string;
    token: string;
};
export class Client {
    private config: client_options;
    constructor(options: client_options) {
        this.config = options;
    }

    public getConfig(): client_options {
        return this.config;
    }

    public getRequestOptions(
        method: string,
        body?: string,
        additional_headers?: Array<{ key: string; content: string }>,
    ): {
        method: string;
        headers: Headers;
        redirect: "follow";
        body?: string;
    } {
        const headers = new Headers();
        headers.append("Authorization", `Bearer ${this.getConfig().token}`);
        if (additional_headers) {
            for (const header of additional_headers) {
                headers.append(header.key, header.content);
            }
        }
        if (body) {
            return {
                method: method,
                headers: headers,
                redirect: "follow",
                body: body,
            };
        }
        return {
            method: method,
            headers: headers,
            redirect: "follow",
        };
    }
}
