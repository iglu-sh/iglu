// test/helpers/mock-express.ts
import type { Response } from "express";

export interface MockResponse extends Response {
    _status: number | null;
    _body: unknown;
    _jsonBody: unknown;
    _headers: Record<string, string>;
    _sent: boolean;
    _statusCalls: number[];
    _sendCalls: unknown[];
    _jsonCalls: unknown[];
    _sendFileCalls: Array<string>;
    _selectedFile: undefined | string;
}

export function createMockResponse(): MockResponse {
    // biome-ignore lint/suspicious/noExplicitAny: There really isn't a better type for this
    const res: any = {
        _status: null,
        _body: undefined,
        _jsonBody: undefined,
        _headers: {},
        _sent: false,
        _statusCalls: [],
        _sendCalls: [],
        _jsonCalls: [],
        _sendFileCalls: [],
        _selectedFile: undefined 
    };

    res.status = (code: number) => {
        res._status = code;
        res._statusCalls.push(code);
        return res;
    };

    res.send = (body: unknown) => {
        res._body = body;
        res._sent = true;
        res._sendCalls.push(body);
        return res;
    };

    res.json = (body: unknown) => {
        res._jsonBody = body;
        res._sent = true;
        res._jsonCalls.push(body);
        return res;
    };

    res.sendStatus = (code: number) => {
        res._status = code;
        res._sent = true;
        res._statusCalls.push(code);
        return res;
    };

    res.setHeader = (name: string, value: string) => {
        res._headers[name.toLowerCase()] = value;
        return res;
    };

    res.getHeader = (name: string) => {
        return res._headers[name.toLowerCase()];
    };

    res.sendFile = (link:string) => {
        res._sendFileCalls.push(link),
        res._selectedFile = link 
        return res;
    }

    return res as MockResponse;
}
