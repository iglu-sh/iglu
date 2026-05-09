import { expect, test } from "bun:test";
import { post } from "@/cache/routes/api/v1/cache/[tenant]/key.ts";
import Api_keys from "@/shared/db/DAO/api_key";
import { Api_keys_tenants_link } from "@/shared/db/DAO/api_key_tenant_link";
import Tenants from "@/shared/db/DAO/tenants";
import { hashApiKey } from "@/shared/utils/crypto/api_key_generation";
import { createMockRequest } from "@/shared/utils/expressUnitTests/createMockRequest";
import { base_response_schema, error_response_schema } from "@/shared/utils/zod/zod_rest_schemas";
import { run_endpoint } from "@/tests/cache/utils/runEndpoint";
import { setupDatabaseForCacheMockTesting } from "../../../../../utils/setupDatabase";

await setupDatabaseForCacheMockTesting();

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
