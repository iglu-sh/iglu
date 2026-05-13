import { expect, test } from "bun:test";
import * as fs from "node:fs";
import { get } from "@/cache/routes/[tenant]/[hash].narinfo";
import type { derivation as derivation_type } from "@/db_types";
import { Derivation_tenant_link, Derivations, Requests, Tenants } from "@/shared/db";
import { createMockRequest } from "@/shared/utils/expressUnitTests/createMockRequest";
import parseNarInfoIntoJSON from "@/shared/utils/nix/parseNarInfoIntoJSON";
import { nar_info_schema } from "@/shared/utils/zod/zod_nix_schemas";
import { error_response_schema } from "@/shared/utils/zod/zod_rest_schemas";
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

    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: tenant_to_use.name,
        hash: derivation.cstorehash,
    };

    const result = await run_endpoint(request, get);
    expect(result).toBeDefined();
    expect(result._status).toBe(200);
    expect(result._jsonBody).toBeUndefined();
    expect(result._body).toBeDefined();
    expect(result._body).toBeString();
    const out = parseNarInfoIntoJSON(result._body as string);
    expect(nar_info_schema.safeParse(out).success).toBeTrue();
});

test("Expect a GET request that is unauthenticated to work", async () => {
    const request = createMockRequest();

    request.headers = {
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: tenant_to_use.name,
        hash: derivation.cstorehash,
    };

    const result = await run_endpoint(request, get);
    expect(result).toBeDefined();
    expect(result._status).toBe(200);
    expect(result._jsonBody).toBeUndefined();
    expect(result._body).toBeDefined();
    expect(result._body).toBeString();
    const out = parseNarInfoIntoJSON(result._body as string);
    expect(nar_info_schema.safeParse(out).success).toBeTrue();
});

test("Expect a GET request that is missing the tenant param to fail", async () => {
    const request = createMockRequest();

    request.headers = {
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        hash: derivation.cstorehash,
    };

    const result = await run_endpoint(request, get);
    expect(result).toBeDefined();
    expect(result._status).toBe(400);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a GET request that is referring to a non-existant tenant to fail", async () => {
    const request = createMockRequest();

    request.headers = {
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        hash: derivation.cstorehash,
        tenant: Bun.randomUUIDv7(),
    };

    const result = await run_endpoint(request, get);
    expect(result).toBeDefined();
    expect(result._status).toBe(404);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a GET request that missing the hash param to fail", async () => {
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
    expect(result._status).toBe(400);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a GET request that is referring to an unknown hash to fail", async () => {
    const request = createMockRequest();

    request.headers = {
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: tenant_to_use.name,
        hash: Bun.randomUUIDv7(),
    };

    const result = await run_endpoint(request, get);
    expect(result).toBeDefined();
    expect(result._status).toBe(404);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a GET that is referring to an outdated derivation to return 404 and delete that in the database", async () => {
    const request = createMockRequest();
    writeTestFile(derivation);
    await new Tenants().update({
        ...tenant_to_use,
        ttl: 1,
    });
    await new Requests().removeAllForLink(link.id);
    const newest = await new Requests().insert({
        id: "n/a",
        derivations_tenants_links: link.id,
        direction: "inbound",
        url: "/api/v1/iglu/upload/something/something",
        date: 1,
    });

    await new Requests().update({
        ...newest,
        date: 1,
    });

    request.headers = {
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: tenant_to_use.name,
        hash: derivation.cstorehash,
    };

    const result = await run_endpoint(request, get);
    expect(result).toBeDefined();
    expect(result._status).toBe(404);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();

    const derivation_in_db = await new Derivations().getById(derivation.id);
    expect(derivation_in_db).toBeNull();
});

test("Expect a GET that is referring to a derivation that does not have a single request associated with it to return 404 and delete that in the database", async () => {
    const request = createMockRequest();
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
    writeTestFile(derivation);
    const link = await new Derivation_tenant_link().insert({
        id: "n/a",
        derivations_id: derivation,
        tenants_id: tenant_to_use,
    });
    await new Requests().removeAllForLink(link.id);

    request.headers = {
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: tenant_to_use.name,
        hash: derivation.cstorehash,
    };

    const result = await run_endpoint(request, get);
    expect(result).toBeDefined();
    expect(result._status).toBe(404);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();

    const derivation_in_db = await new Derivations().getById(derivation.id);
    expect(derivation_in_db).toBeNull();
});

test("Expect a GET request that does not have an x-forwarded-for header to fail", async () => {
    const request = createMockRequest();

    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: tenant_to_use.name,
        hash: derivation.cstorehash,
    };

    const result = await run_endpoint(request, get);
    expect(result).toBeDefined();
    expect(result._status).toBe(403);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});
