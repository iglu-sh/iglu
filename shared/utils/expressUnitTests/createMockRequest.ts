import type { Request } from "express";

export function createMockRequest(overrides: Partial<Request> = {}): Request {
    return {
        body: {},
        params: {},
        query: {},
        headers: {},
        ...overrides,
    } as Request;
}
