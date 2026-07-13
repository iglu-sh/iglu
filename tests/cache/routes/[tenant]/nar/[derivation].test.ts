import { expect, test } from "bun:test";
import * as fs from "node:fs";
import { get } from "@/cache/routes/[tenant]/nar/[derivation]";
import type { derivation as derivation_type } from "@/db_types";
import { Derivation_tenant_link, Derivations, Requests } from "@/shared/db";
import { createMockRequest } from "@/shared/utils/expressUnitTests/createMockRequest";
import { error_response_schema } from "@/shared/utils/zod/rest/base_rest_schemas";
import { run_endpoint } from "@/tests/cache/utils/runEndpoint";
import { setupTenantStructure } from "@/tests/cache/utils/setupTenantStructure";

const { tenant_to_use, auth_token, signing_key } = await setupTenantStructure();
const derivation = await new Derivations().insert({
    id: "n/a",
    signing_keys_id: signing_key,
    cderiver: "test",
    cstorehash: "test",
    cfilehash: "test",
    cfilesize: 0,
    cnarhash: "test",
    cnarsize: "0",
    compression: "xz",
    creferences: '["test"]',
    csig: "test",
    cstoresuffix: "test",
    parts: "",
});

const link = await new Derivation_tenant_link().insert({
    id: "n/a",
    derivations_id: derivation,
    tenants_id: tenant_to_use,
});

await new Requests().insert({
    id: "n/a",
    derivations_tenants_links: link.id,
    direction: "inbound",
    url: "/api/v1/iglu/upload/something/something",
    date: Date.now(),
});

fs.mkdirSync(`/tmp/iglu/${tenant_to_use.id}`, { recursive: true });
function writeTestFile(derivation_to_use: derivation_type) {
    fs.writeFileSync(
        `/tmp/iglu/${tenant_to_use.id}/${derivation_to_use.cstorehash}-${derivation_to_use.cstorehash}.${derivation_to_use.compression}`,
        "Just something cool",
    );
}

test("Expect a GET request that is authenticated to work", async () => {
    const request = createMockRequest();
    writeTestFile(derivation);

    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: tenant_to_use.name,
        derivation: derivation.cstorehash,
    };

    const result = await run_endpoint(request, get);
    expect(result).toBeDefined();
    expect(result._status).toBe(200);
    expect(result._jsonBody).toBeUndefined();
    expect(result._body).toBeUndefined();
    expect(result._selectedFile).toBeDefined();
    expect(result._selectedFile).toBeString();
});

test("Expect a GET request that is unauthenticated to work", async () => {
    const request = createMockRequest();
    writeTestFile(derivation);

    request.headers = {
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: tenant_to_use.name,
        derivation: derivation.cstorehash,
    };

    const result = await run_endpoint(request, get);
    expect(result).toBeDefined();
    expect(result._status).toBe(200);
    expect(result._jsonBody).toBeUndefined();
    expect(result._body).toBeUndefined();
    expect(result._selectedFile).toBeDefined();
    expect(result._selectedFile).toBeString();
});

test("Expect a GET request that does not have the tenant param set to fail", async () => {
    const request = createMockRequest();
    writeTestFile(derivation);

    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        derivation: derivation.cstorehash,
    };

    const result = await run_endpoint(request, get);
    expect(result).toBeDefined();
    expect(result._status).toBe(400);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a GET request that has an invalid tenant set to fail", async () => {
    const request = createMockRequest();
    writeTestFile(derivation);

    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: Bun.randomUUIDv7(),
        derivation: derivation.cstorehash,
    };

    const result = await run_endpoint(request, get);
    expect(result).toBeDefined();
    expect(result._status).toBe(404);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a GET request that does not have the derivation param set to fail", async () => {
    const request = createMockRequest();
    writeTestFile(derivation);

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
    expect(result._status).toBe(400);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a GET request that has an invalid derivation param set to fail", async () => {
    const request = createMockRequest();
    writeTestFile(derivation);

    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: tenant_to_use.name,
        derivation: Bun.randomUUIDv7(),
    };

    const result = await run_endpoint(request, get);
    expect(result).toBeDefined();
    expect(result._status).toBe(404);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a GET request that tries to access a derivation that does not have a file associated with it to fail", async () => {
    const request = createMockRequest();

    fs.rmSync(
        `/tmp/iglu/${tenant_to_use.id}/${derivation.cstorehash}-${derivation.cstorehash}.${derivation.compression}`,
    );

    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: tenant_to_use.name,
        derivation: derivation.cstorehash,
    };

    const result = await run_endpoint(request, get);
    expect(result).toBeDefined();
    expect(result._status).toBe(404);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a GET request that referrs to a derivation that was never uploaded to fail", async () => {
    const request = createMockRequest();
    writeTestFile(derivation);

    await new Requests().removeAllForLink(link.id);
    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: tenant_to_use.name,
        derivation: derivation.cstorehash,
    };

    const result = await run_endpoint(request, get);
    expect(result).toBeDefined();
    expect(result._status).toBe(404);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a GET request that requests a derivation that is outside of its specified ttl to fail", async () => {
    const derivation_new = await new Derivations().insert({
        id: "n/a",
        signing_keys_id: signing_key,
        cderiver: "test",
        cstorehash: "test",
        cfilehash: "test",
        cfilesize: 0,
        cnarhash: "test",
        cnarsize: "0",
        compression: "xz",
        creferences: '["test"]',
        csig: "test",
        cstoresuffix: "test",
        parts: "",
    });

    const link_new = await new Derivation_tenant_link().insert({
        id: "n/a",
        derivations_id: derivation_new,
        tenants_id: tenant_to_use,
    });

    const request_db = await new Requests().insert({
        id: "n/a",
        derivations_tenants_links: link_new.id,
        direction: "inbound",
        url: "/api/v1/iglu/upload/something/something",
        date: Date.now(),
    });

    await new Requests().update({
        ...request_db,
        date: 1,
    });
    const request = createMockRequest();
    writeTestFile(derivation_new);

    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: tenant_to_use.name,
        derivation: derivation_new.cstorehash,
    };

    const result = await run_endpoint(request, get);
    expect(result).toBeDefined();
    expect(result._status).toBe(404);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});
