import { expect, test } from "bun:test";
import { post } from "@/cache/routes/api/v1/cache/[tenant]/key.ts";
import { createMockRequest } from "@/shared/utils/expressUnitTests/createMockRequest";
import {
    base_response_schema,
    error_response_schema,
} from "@/shared/utils/zod/rest/base_rest_schemas";
import { run_endpoint } from "@/tests/cache/utils/runEndpoint";
import { setupTenantStructure } from "@/tests/cache/utils/setupTenantStructure";

const { tenant_to_use, auth_token } = await setupTenantStructure();

test("Expect a POST request that is authenticated and referring to an existing tenant to work", async () => {
    const request = createMockRequest();
    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: tenant_to_use.name,
    };
    request.body = {
        publicKey: "some public key",
    };

    const result = await run_endpoint(request, post);

    expect(result).toBeDefined();
    expect(result._status).toBe(200);
    expect(base_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a POST request that is authenticated but referring to a nonexistant tenant to fail", async () => {
    const request = createMockRequest();
    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: "nonexistant-tenant",
    };
    request.body = {
        publicKey: "some public key",
    };

    const result = await run_endpoint(request, post);

    expect(result).toBeDefined();
    expect(result._status).toBe(404);
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a POST request that is unauthenticated but referring to an existing tenant to fail", async () => {
    const request = createMockRequest();
    request.headers = {
        authorization: `Bearer `,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: tenant_to_use.name,
    };
    request.body = {
        publicKey: "some public key",
    };

    const result = await run_endpoint(request, post);

    expect(result).toBeDefined();
    expect(result._status).toBe(403);
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a POST request that is missing an x-forwarded-for header to be rejected", async () => {
    const request = createMockRequest();
    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: tenant_to_use.name,
    };
    request.body = {
        publicKey: "some public key",
    };

    const result = await run_endpoint(request, post);

    expect(result).toBeDefined();
    expect(result._status).toBe(403);
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a POST request that contains an invalid body to fail", async () => {
    const request = createMockRequest();
    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: tenant_to_use.name,
    };
    request.body = {
        publicKey_invalid: "some public key",
    };

    const result = await run_endpoint(request, post);

    expect(result).toBeDefined();
    expect(result._status).toBe(400);
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a POST request that contains no auth header to fail", async () => {
    const request = createMockRequest();
    request.headers = {
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: tenant_to_use.name,
    };
    request.body = {
        publicKey: "some public key",
    };

    const result = await run_endpoint(request, post);

    expect(result).toBeDefined();
    expect(result._status).toBe(403);
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a POST request that has a malformed authorization request to fail", async () => {
    const request = createMockRequest();
    request.headers = {
        authorization: `Bearer${auth_token}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: tenant_to_use.name,
    };
    request.body = {
        publicKey: "some public key",
    };

    const result = await run_endpoint(request, post);

    expect(result).toBeDefined();
    expect(result._status).toBe(403);
    expect(base_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a POST request that is using an invalid auth token to fail", async () => {
    const request = createMockRequest();
    request.headers = {
        authorization: `Bearer ${Bun.randomUUIDv7()}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: tenant_to_use.name,
    };
    request.body = {
        publicKey: "some public key",
    };

    const result = await run_endpoint(request, post);

    expect(result).toBeDefined();
    expect(result._status).toBe(401);
    expect(base_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a POST request that replaces a public key to work", async () => {
    const request = createMockRequest();
    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: tenant_to_use.name,
    };
    request.body = {
        publicKey: "some public key",
    };

    const result = await run_endpoint(request, post);

    expect(result).toBeDefined();
    expect(result._status).toBe(200);
    expect(base_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});
