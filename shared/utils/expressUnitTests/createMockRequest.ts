import type { Request } from "express";
import type { IncomingHttpHeaders } from "node:http";
import { Readable } from "node:stream";

export interface MockRequestOptions extends Partial<Request> {
  body?: unknown;
  headers?: IncomingHttpHeaders;
}

function isStreamable(value: unknown): value is Buffer | Uint8Array | string {
  return (
    typeof value === "string" ||
    value instanceof Uint8Array || // Buffer is a Uint8Array
    value instanceof Buffer
  );
}

export function createMockRequest(overrides: MockRequestOptions = {}): Request {
  const { body, headers = {}, ...rest } = overrides;

  const streamable = isStreamable(body);
  const source = streamable ? [body as Buffer | Uint8Array | string] : [];
  const stream = Readable.from(source) as unknown as Request;

  Object.assign(stream, {
    params: {},
    query: {},
    headers: {
      ...(streamable && body instanceof Uint8Array
        ? {
            "content-type": "application/octet-stream",
            "content-length": String((body as Uint8Array).length),
          }
        : {}),
      ...headers,
    },
    // Parsed body — what `express.json()` would have produced
    body: streamable ? undefined : body,
    ...rest,
  });

  return stream;
}
