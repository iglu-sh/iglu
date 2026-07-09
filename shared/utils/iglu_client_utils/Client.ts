export type client_options = {
    hostname: string;
    token: string;
};
export default class Client {
    private config: client_options;
    constructor(options: client_options) {
        this.config = options;
    }

    public getConfig(): client_options {
        return this.config;
    }

    public getRequestOptions(method: string): {
        method: string;
        headers: Headers;
        redirect: "follow";
    } {
        const headers = new Headers();
        headers.append("Authorization", `Bearer ${this.getConfig().token}`);
        return {
            method: method,
            headers: headers,
            redirect: "follow",
        };
    }
}
