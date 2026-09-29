export interface IgluOptions {
    baseUrl: string;
    token: string;
    timeoutMs?: number;
    maxRetries?: number;
    fetch?: typeof fetch;
}

/*
class Core {
    private readonly baseUrl: string;
    private readonly token: string;
    private readonly timeoutMs: number;
    private readonly maxRetries: number;
    private readonly fetch: typeof fetch;

    constructor(_config: IgluOptions) {}
}
*/

export class Iglu {}
