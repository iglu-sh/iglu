import type { Request } from "express";

export function createMockRequest(overrides: Partial<Request> = {}): Request {
    return {
        body: {},
        params: {},
        query: {},
        headers: {},
        socket: {
            remoteAddress: "1.2.3.4",
        },
        ...overrides,
    } as Request;
}
