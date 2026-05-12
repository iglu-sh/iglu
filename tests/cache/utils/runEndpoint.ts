import type { NextFunction, Request, Response } from "express";
import type { MockResponse } from "@/shared/utils/expressUnitTests/createMockResponse";
import { createMockResponse } from "@/shared/utils/expressUnitTests/createMockResponse";

/**
 * @description Runs a given endpoint and all of its middlewares and returns the earliest response (i.e if a middleware fires and returns a request before the actual function, then that is returned)
 * @param {Request} req The request you want to provide to the endpoint
 * @param {Array<(req: Request, res: Response, next: NextFunction) => void | Promise<any>>} endpoint The endpoint to run
 * @returns {Promise<MockResponse>}
 * */
export async function run_endpoint(
    req: Request,
    //biome-ignore lint/suspicious/noExplicitAny:No better type found
    //biome-ignore lint/suspicious/noConfusingVoidType:well it's the correct type
    endpoint: Array<(req: Request, res: Response, next: NextFunction) => void | Promise<any>>,
): Promise<MockResponse> {
    const response = createMockResponse();
    for (const element of endpoint) {
        const func_value = await element(req, response, () => {});
        if (func_value !== undefined) {
            break;
        }
    }
    return response;
}
