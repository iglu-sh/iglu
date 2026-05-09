import { expect, test } from "bun:test";
import { get } from "@/cache/routes/api/v1/cache/[tenant].ts";
import Api_keys from "@/shared/db/DAO/api_key";
import { Api_keys_tenants_link } from "@/shared/db/DAO/api_key_tenant_link";
import Signing_Keys from "@/shared/db/DAO/signing_keys";
import Tenants from "@/shared/db/DAO/tenants";
import { hashApiKey } from "@/shared/utils/crypto/api_key_generation";
import { createMockRequest } from "@/shared/utils/expressUnitTests/createMockRequest";
import { nix_tenant_information_schema } from "@/shared/utils/zod/zod_cachix_schemas";
import { error_response_schema } from "@/shared/utils/zod/zod_rest_schemas";
import { run_endpoint } from "@/tests/cache/utils/runEndpoint";
import { setupDatabaseForCacheMockTesting } from "../../../../utils/setupDatabase";

await setupDatabaseForCacheMockTesting();

const request_to_use = createMockRequest();
request_to_use.headers = {
    authorization: "Bearer 11.1.1",
    "x-forwarded-for": "10.0.0.1",
};

const tenant_to_use = await new Tenants().insert({
    id: "n/a",
    github_username: "test_user",
    name: Bun.randomUUIDv7(),
    permission: "Read",
    is_public: true,
    preferred_compression_method: "XZ",
    uri: "http://test.example.com/agent_test",
    priority: 1,
    ttl: 1,
});

const auth_token = Bun.randomUUIDv7();

const api_key = await new Api_keys().insert({
    id: "n/a",
    hash: hashApiKey(auth_token),
    name: "Test hash key",
});

await new Api_keys_tenants_link().insert({
    id: "n/a",
    api_keys_id: api_key,
    tenants_id: tenant_to_use,
});

await new Signing_Keys().insert({
    id: "n/a",
    api_keys_id: api_key,
    name: "Yeah",
    key: "This is just a test, not a real key",
});

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
