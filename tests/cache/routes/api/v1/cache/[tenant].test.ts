import { expect, test } from "bun:test";
import { get } from "@/cache/routes/api/v1/cache/[tenant].ts";
import { createMockRequest } from "@/shared/utils/expressUnitTests/createMockRequest";
import { error_response_schema } from "@/shared/utils/zod/rest/base_rest_schemas";
import { nix_tenant_information_schema } from "@/shared/utils/zod/zod_cachix_schemas";
import { run_endpoint } from "@/tests/cache/utils/runEndpoint";
import { setupTenantStructure } from "@/tests/cache/utils/setupTenantStructure";

const request_to_use = createMockRequest();
request_to_use.headers = {
    authorization: "Bearer 11.1.1",
    "x-forwarded-for": "10.0.0.1",
};

const { tenant_to_use, auth_token } = await setupTenantStructure();

test("Expect a GET request that is authenticated and referring to an existing tenant to work", async () => {
    const request = createMockRequest();
    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: tenant_to_use.name,
    };

    const result = await run_endpoint(request, get);

    expect(result).toBeDefined();
    expect(result._status).toBe(200);
    expect(nix_tenant_information_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a GET request that is authenticated and referring to a non-existant tenant to fail", async () => {
    const request = createMockRequest();
    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: "something something",
    };

    const result = await run_endpoint(request, get);

    expect(result).toBeDefined();
    expect(result._status).toBe(404);
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a GET request that is authenticated and but does not provide the user-agent header to fail", async () => {
    const request = createMockRequest();
    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "x-forwarded-for": "10.0.0.1",
    };
    request.params = {
        tenant: tenant_to_use.name,
    };

    const result = await run_endpoint(request, get);

    expect(result).toBeDefined();
    expect(result._status).toBe(403);
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a GET request that is authenticated and but does not provide the tenant param to fail", async () => {
    const request = createMockRequest();
    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {};

    const result = await run_endpoint(request, get);

    expect(result).toBeDefined();
    expect(result._status).toBe(404);
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a GET request that is unauthenticated but referring to an existing tenant to fail", async () => {
    const request = createMockRequest();
    request.headers = {
        authorization: `Bearer ${Bun.randomUUIDv7()}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: tenant_to_use.name,
    };

    const result = await run_endpoint(request, get);

    expect(result).toBeDefined();
    expect(result._status).toBe(401);
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a GET request that is missing a user-agent header to be rejected", async () => {
    const request = createMockRequest();
    request.headers = {
        authorization: `Bearer ${Bun.randomUUIDv7()}`,
        "x-forwarded-for": "10.0.0.1",
    };
    request.params = {
        tenant: tenant_to_use.name,
    };

    const result = await run_endpoint(request, get);

    expect(result).toBeDefined();
    expect(result._status).toBe(401);
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a GET request that is missing an x-forwarded-for header to be rejected", async () => {
    const request = createMockRequest();
    request.headers = {
        authorization: `Bearer ${Bun.randomUUIDv7()}`,
    };
    request.params = {
        tenant: tenant_to_use.name,
    };

    const result = await run_endpoint(request, get);

    expect(result).toBeDefined();
    expect(result._status).toBe(403);
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});
