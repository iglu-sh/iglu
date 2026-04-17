export type UnifiedRestResponse = {
    status_code: number;
    status_message: string;
    is_error: boolean;
    timestamp: number;
    data: object;
};
