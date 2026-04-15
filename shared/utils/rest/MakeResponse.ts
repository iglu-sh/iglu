import type { UnifiedRestResponse } from "../../types/rest";

export default function MakeRestResponse(
    status_code:number,
    status_message:string,
    is_error: boolean,
    data: object
):UnifiedRestResponse{
    return {
        status_code: status_code,
        status_message: status_message,
        is_error: is_error,
        data: data,
        timestamp: Date.now()
    }
}
