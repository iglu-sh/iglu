export type openapi_definiton = {
    meta: {
        path: string;
        authentication_required: boolean;
        feature_filtered: boolean;
        tags: Array<string>;
    };
    routes: Array<{
        method: string;
        description: string;
        summary: string;
        responses: {
            [key: number]: {
                description: string;
                content: {
                    [key: string]: {
                        schema: object;
                    };
                };
            };
        };
        request?: {
            params?: object;
            headers?: object;
            body?: object;
            query?: object;
        };
    }>;
};
