import { expect, test } from "bun:test";
import { createMockRequest } from "@/shared/utils/expressUnitTests/createMockRequest";
import { run_endpoint } from "@/tests/cache/utils/runEndpoint";
import { post } from "@/cache/routes/api/v1/cache/[tenant]/multipart-nar";
import { Signing_Keys } from "@/shared/db";
import { multipart_nar_schema } from "@/shared/utils";
import { error_response_schema } from "@/shared/utils/zod/zod_rest_schemas";
import { setupTenantStructure } from "@/tests/cache/utils/setupTenantStructure";

const {tenant_to_use, auth_token, signing_key} = await setupTenantStructure()

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
    request.query = {
        compression: "xz"
    };
    const result = await run_endpoint(request, post)
    expect(result).toBeDefined()
    expect(result._status).toBe(200)
    expect(result._jsonBody).toBeDefined()
    expect(multipart_nar_schema.safeParse(result._jsonBody).success).toBeTrue()
})

test("Expect a POST request that is authenticated, referring to an existing tenant and using the other supported compressions to work", async () => {
    const request = createMockRequest();
    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: tenant_to_use.name,
    };
    request.query = {
        compression: "zst"
    };
    const result = await run_endpoint(request, post)
    expect(result).toBeDefined()
    expect(result._status).toBe(200)
    expect(result._jsonBody).toBeDefined()
    expect(multipart_nar_schema.safeParse(result._jsonBody).success).toBeTrue()
})

test("Expect a  POST request that is unauthenticated to fail", async () => {
    const request = createMockRequest();
    request.headers = {
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: tenant_to_use.name,
    };
    request.query = {
        compression: "xz"
    };
    const result = await run_endpoint(request, post)
    expect(result).toBeDefined()
    expect(result._status).toBe(403)
    expect(result._jsonBody).toBeDefined()
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue()
})


test("Expect a POST request that is authenticated but missing an IP to fail", async () => {
    const request = createMockRequest();
    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: tenant_to_use.name,
    };
    request.query = {
        compression: "xz"
    };
    const result = await run_endpoint(request, post)
    expect(result).toBeDefined()
    expect(result._status).toBe(403)
    expect(result._jsonBody).toBeDefined()
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue()
})

test("Expect a POST request that tries to use an unsupported compression to fail", async () => {
    const request = createMockRequest();
    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "user-agent": "iglu-sh testing client",
        "x-forwarded-for": "10.0.0.1"
    };
    request.params = {
        tenant: tenant_to_use.name,
    };
    request.query = {
        compression: "brotli"
    };
    const result = await run_endpoint(request, post)
    expect(result).toBeDefined()
    expect(result._status).toBe(400)
    expect(result._jsonBody).toBeDefined()
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue()
})

test("Expect a POST request that has an auth header but doesn't provide it in the correct format to fail", async () => {
    const request = createMockRequest();
    request.headers = {
        authorization: `Bearer`,
        "user-agent": "iglu-sh testing client",
        "x-forwarded-for": "10.0.0.1"
    };
    request.params = {
        tenant: tenant_to_use.name,
    };
    request.query = {
        compression: "zst"
    };
    const result = await run_endpoint(request, post)
    expect(result).toBeDefined()
    expect(result._status).toBe(403)
    expect(result._jsonBody).toBeDefined()
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue()
})

test("Expect a POST request that is referring to a non-existant Tenant to fail", async () => {
    const request = createMockRequest();
    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "user-agent": "iglu-sh testing client",
        "x-forwarded-for": "10.0.0.1"
    };
    request.params = {
        tenant: Bun.randomUUIDv7(),
    };
    request.query = {
        compression: "zst"
    };
    const result = await run_endpoint(request, post)
    expect(result).toBeDefined()
    expect(result._status).toBe(404)
    expect(result._jsonBody).toBeDefined()
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue()
})

test("Expect a POST request that does not have a compression query parameter set to fail", async () => {
    const request = createMockRequest();
    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "user-agent": "iglu-sh testing client",
        "x-forwarded-for": "10.0.0.1"
    };
    request.params = {
        tenant: tenant_to_use.name,
    };
    const result = await run_endpoint(request, post)
    expect(result).toBeDefined()
    expect(result._status).toBe(400)
    expect(result._jsonBody).toBeDefined()
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue()
})

test("Expect a POST request that is using an api key without a signing key to fail", async () => {
    await new Signing_Keys().delete(signing_key)
    const request = createMockRequest();
    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "user-agent": "iglu-sh testing client",
        "x-forwarded-for": "10.0.0.1"
    };
    request.params = {
        tenant: tenant_to_use.name,
    };
    request.query = {
        compression: "zst"
    };
    const result = await run_endpoint(request, post)
    expect(result).toBeDefined()
    expect(result._status).toBe(400)
    expect(result._jsonBody).toBeDefined()
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue()
})

