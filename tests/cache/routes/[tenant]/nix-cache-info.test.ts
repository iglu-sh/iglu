import { expect, test } from "bun:test";
import { get } from "@/cache/routes/[tenant]/nix-cache-info";
import { createMockRequest } from "@/shared/utils/expressUnitTests/createMockRequest";
import parseNarInfoIntoJSON from "@/shared/utils/nix/parseNarInfoIntoJSON";
import { error_response_schema } from "@/shared/utils/zod/rest/base_rest_schemas";
import { tenant_info_schema } from "@/shared/utils/zod/zod_nix_schemas";
import { run_endpoint } from "@/tests/cache/utils/runEndpoint";
import { setupTenantStructure } from "@/tests/cache/utils/setupTenantStructure";

const { tenant_to_use, auth_token } = await setupTenantStructure();

test("Expect an authenticated GET request to work", async () => {
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
    expect(result._jsonBody).toBeUndefined();
    expect(result._body).toBeDefined();
    expect(result._body).toBeString();
    const out = parseNarInfoIntoJSON(result._body as string);
    expect(tenant_info_schema.safeParse(out).success).toBeTrue();
});

test("Expect an unauthenticated GET request to work", async () => {
    const request = createMockRequest();

    request.headers = {
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: tenant_to_use.name,
    };

    const result = await run_endpoint(request, get);
    expect(result).toBeDefined();
    expect(result._status).toBe(200);
    expect(result._jsonBody).toBeUndefined();
    expect(result._body).toBeDefined();
    expect(result._body).toBeString();
    const out = parseNarInfoIntoJSON(result._body as string);
    expect(tenant_info_schema.safeParse(out).success).toBeTrue();
});

test("Expect a GET request to an invalid tenant to return 404", async () => {
    const request = createMockRequest();

    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: Bun.randomUUIDv7(),
    };

    const result = await run_endpoint(request, get);
    expect(result).toBeDefined();
    expect(result._status).toBe(404);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a GET request without the tenant param to return 404", async () => {
    const request = createMockRequest();

    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };

    const result = await run_endpoint(request, get);
    expect(result).toBeDefined();
    expect(result._status).toBe(404);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a GET request that is missing the x-forwarded-for header to fail", async () => {
    const request = createMockRequest();

    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: tenant_to_use.name,
    };

    const result = await run_endpoint(request, get);
    expect(result).toBeDefined();
    expect(result._status).toBe(403);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});
