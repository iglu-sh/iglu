import { expect, test } from "bun:test";
import { post } from "@/cache/routes/api/v1/cache/[tenant]/multipart-nar/[uid]";
import { Uploads } from "@/shared/db";
import { multipart_nar_uid_initialization_schema } from "@/shared/utils";
import { createMockRequest } from "@/shared/utils/expressUnitTests/createMockRequest";
import { error_response_schema } from "@/shared/utils/zod/rest/base_rest_schemas";
import { run_endpoint } from "@/tests/cache/utils/runEndpoint";
import { setupTenantStructure } from "@/tests/cache/utils/setupTenantStructure";

const { tenant_to_use, auth_token, api_key } = await setupTenantStructure();
const upload_id = await new Uploads().insert({
    id: "n/a",
    tenants_id: tenant_to_use,
    signed_by: api_key,
    md5: "none",
    compression: "xz",
});

test("Expect a POST request that is authenticated and referring to an existing tenant to work", async () => {
    const request = createMockRequest();
    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.body = {
        contentMD5: "some md5",
    };
    request.params = {
        tenant: tenant_to_use.name,
        uid: upload_id.id,
    };
    request.query = {
        partNumber: "1",
    };
    const result = await run_endpoint(request, post);
    expect(result).toBeDefined();
    expect(result._status).toBe(200);
    expect(result._jsonBody).toBeDefined();
    expect(multipart_nar_uid_initialization_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a POST request that is authenticated, referring to an existing tenant but having no partNumber query to fail", async () => {
    const request = createMockRequest();
    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.body = {
        contentMD5: "some md5",
    };
    request.params = {
        tenant: tenant_to_use.name,
        uid: upload_id.id,
    };
    const result = await run_endpoint(request, post);
    expect(result).toBeDefined();
    expect(result._status).toBe(400);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a POST request that is authenticated, referring to an existing tenant but having malformed request params to fail", async () => {
    const request = createMockRequest();
    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.body = {
        contentMD5: "some md5",
    };
    request.params = {
        tenant: tenant_to_use.name,
    };
    request.query = {
        partNumber: "1",
    };

    const result = await run_endpoint(request, post);
    expect(result).toBeDefined();
    expect(result._status).toBe(400);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a POST request that is authenticated, but referring to a non-existant tenant to fail", async () => {
    const request = createMockRequest();
    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.body = {
        contentMD5: "some md5",
    };
    request.params = {
        tenant: Bun.randomUUIDv7(),
        uid: upload_id.id,
    };
    request.query = {
        partNumber: "1",
    };

    const result = await run_endpoint(request, post);
    expect(result).toBeDefined();
    expect(result._status).toBe(404);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a POST request that has a malformed body to fail", async () => {
    const request = createMockRequest();
    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.body = {
        no_content_md5: "yeah",
    };
    request.params = {
        uid: upload_id.id,
        tenant: tenant_to_use.name,
    };
    request.query = {
        partNumber: "1",
    };

    const result = await run_endpoint(request, post);
    expect(result).toBeDefined();
    expect(result._status).toBe(400);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a POST request that is authenticated but missing the tenant param to fail", async () => {
    const request = createMockRequest();
    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.body = {
        contentMD5: "some md5",
    };
    request.params = {
        uid: upload_id.id,
    };
    request.query = {
        partNumber: "1",
    };

    const result = await run_endpoint(request, post);
    expect(result).toBeDefined();
    expect(result._status).toBe(400);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a POST request that is missing a body to fail", async () => {
    const request = createMockRequest();
    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: tenant_to_use.name,
        uid: upload_id.id,
    };
    request.query = {
        partNumber: "1",
    };

    const result = await run_endpoint(request, post);
    expect(result).toBeDefined();
    expect(result._status).toBe(400);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a POST request that is missing the auth header to fail", async () => {
    const request = createMockRequest();
    request.headers = {
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.body = {
        contentMD5: "some md5",
    };
    request.params = {
        tenant: tenant_to_use.name,
        uid: upload_id.id,
    };
    request.query = {
        partNumber: "1",
    };
    const result = await run_endpoint(request, post);
    expect(result).toBeDefined();
    expect(result._status).toBe(403);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a POST request that has a malformed auth header to fail", async () => {
    const request = createMockRequest();
    request.headers = {
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
        authorization: "Bearer",
    };
    request.body = {
        contentMD5: "some md5",
    };
    request.params = {
        tenant: tenant_to_use.name,
        uid: upload_id.id,
    };
    request.query = {
        partNumber: "1",
    };
    const result = await run_endpoint(request, post);
    expect(result).toBeDefined();
    expect(result._status).toBe(403);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a POST request that has an unrecognized api key to fail", async () => {
    const request = createMockRequest();
    request.headers = {
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
        authorization: `Bearer ${Bun.randomUUIDv7()}`,
    };
    request.body = {
        contentMD5: "some md5",
    };
    request.params = {
        tenant: tenant_to_use.name,
        uid: upload_id.id,
    };
    request.query = {
        partNumber: "1",
    };
    const result = await run_endpoint(request, post);
    expect(result).toBeDefined();
    expect(result._status).toBe(401);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a POST request that referrs to an invalid upload id to fail", async () => {
    const request = createMockRequest();
    request.headers = {
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
        authorization: `Bearer ${auth_token}`,
    };
    request.body = {
        contentMD5: "some md5",
    };
    request.params = {
        tenant: tenant_to_use.name,
        uid: Bun.randomUUIDv7(),
    };
    request.query = {
        partNumber: "1",
    };
    const result = await run_endpoint(request, post);
    expect(result).toBeDefined();
    expect(result._status).toBe(404);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});
