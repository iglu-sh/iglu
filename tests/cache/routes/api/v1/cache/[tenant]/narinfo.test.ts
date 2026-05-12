import {Derivation_tenant_link} from "@/shared/db/DAO/derivation_tenant_link";
import { expect, test } from "bun:test";
import { createMockRequest } from "@/shared/utils/expressUnitTests/createMockRequest";
import { run_endpoint } from "@/tests/cache/utils/runEndpoint";
import { post } from "@/cache/routes/api/v1/cache/[tenant]/narinfo";
import { Derivations } from "@/shared/db/DAO/derivation";
import { error_response_schema } from "@/shared/utils/zod/zod_rest_schemas";
import z from "zod";
import { setupTenantStructure } from "@/tests/cache/utils/setupTenantStructure";

const {tenant_to_use, auth_token, signing_key} = await setupTenantStructure()

test("Expect a post request that is authenticated and providing a correct body to work", async () => {
    const request = createMockRequest();
    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: tenant_to_use.name,
    };
    request.body = []
    const result = await run_endpoint(request, post)
    expect(result).toBeDefined()
    expect(result._status).toBe(200)
    expect(result._jsonBody).toBeDefined()
    expect(z.array(z.string()).safeParse(result._jsonBody).success).toBeTrue()
})

test("Expect a post request that is authenticated and providing a body with derivation links that the cache does not already have to return the correct number of results with the correct nix store hashes", async () => {
    const request = createMockRequest();
    await new Derivations().insert({
        id: "n/a",
        signing_keys_id: signing_key,
        cderiver: "test",
        cstorehash: "volanta",
        cfilehash: "test",
        cfilesize: 0,
        cnarhash: "test",
        cnarsize: "0",
        compression: "xz",
        creferences: "test",
        csig: "test",
        cstoresuffix: "test",
        parts: "",
    }).then(async (res)=>{
        await new Derivation_tenant_link().insert({
            id: 'n/a',
            derivations_id: res,
            tenants_id: tenant_to_use
        });
    });    
    await new Derivations().insert({
        id: "n/a",
        signing_keys_id: signing_key,
        cderiver: "test",
        cstorehash: "solaar",
        cfilehash: "test",
        cfilesize: 0,
        cnarhash: "test",
        cnarsize: "0",
        compression: "xz",
        creferences: "test",
        csig: "test",
        cstoresuffix: "test",
        parts: "",
    }).then(async (res)=>{
        await new Derivation_tenant_link().insert({
            id: 'n/a',
            derivations_id: res,
            tenants_id: tenant_to_use
        })
    });

    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: tenant_to_use.name,
    };
    request.body = ["solaar", "volanta", "azure-cli"]
    const result = await run_endpoint(request, post)
    expect(result).toBeDefined()
    expect(result._status).toBe(200)
    expect(result._jsonBody).toBeDefined()
    expect(z.array(z.string()).safeParse(result._jsonBody).success).toBeTrue()
    expect((result._jsonBody as Array<string>).length).toBe(1)
    expect((result._jsonBody as Array<string>)[0]).toBe("azure-cli")
})

test("Expect a POST request that is unauthenticated to fail", async() => {
    const request = createMockRequest();
    request.headers = {
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: tenant_to_use.name,
    };
    request.body = [Bun.randomUUIDv7(), Bun.randomUUIDv7()]
    const result = await run_endpoint(request, post)
    expect(result).toBeDefined()
    expect(result._status).toBe(403)
    expect(result._jsonBody).toBeDefined()
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue()
})

test("Expect a POST request that is unauthenticated and presenting a malformed authentication header to fail", async() => {
    const request = createMockRequest();
    request.headers = {
        authorization: `Bearer`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: tenant_to_use.name,
    };
    request.body = [Bun.randomUUIDv7(), Bun.randomUUIDv7()]
    const result = await run_endpoint(request, post)
    expect(result).toBeDefined()
    expect(result._status).toBe(403)
    expect(result._jsonBody).toBeDefined()
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue()
})

test("Expect a POST request that is unauthenticated and presenting a header with an unrecognized auth token to fail", async() => {
    const request = createMockRequest();
    request.headers = {
        authorization: `Bearer ${Bun.randomUUIDv7()}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: tenant_to_use.name,
    };
    request.body = [Bun.randomUUIDv7(), Bun.randomUUIDv7()]
    const result = await run_endpoint(request, post)
    expect(result).toBeDefined()
    expect(result._status).toBe(401)
    expect(result._jsonBody).toBeDefined()
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue()
})

test("Expect a POST request that is referring to an unrecognized tenant to fail", async() => {
    const request = createMockRequest();
    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: Bun.randomUUIDv7(),
    };
    request.body = [Bun.randomUUIDv7(), Bun.randomUUIDv7()]
    const result = await run_endpoint(request, post)
    expect(result).toBeDefined()
    expect(result._status).toBe(404)
    expect(result._jsonBody).toBeDefined()
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue()
})

test("Expect a POST request that does not have the tenant param set to fail", async() => {
    const request = createMockRequest();
    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.body = [Bun.randomUUIDv7(), Bun.randomUUIDv7()]
    const result = await run_endpoint(request, post)
    expect(result).toBeDefined()
    expect(result._status).toBe(404)
    expect(result._jsonBody).toBeDefined()
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue()
})

test("Expect a POST request that is not in the correct format to fail", async() => {
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
        "some": "key",
        "nix_store_hashes": [Bun.randomUUIDv7()]
    } 
    const result = await run_endpoint(request, post)
    expect(result).toBeDefined()
    expect(result._status).toBe(400)
    expect(result._jsonBody).toBeDefined()
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue()
})

test("Expect a post request that is authenticated and providing a correct body to work", async () => {
    const request = createMockRequest();
    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: tenant_to_use.name,
    };
    request.body = []
    const result = await run_endpoint(request, post)
    expect(result).toBeDefined()
    expect(result._status).toBe(200)
    expect(result._jsonBody).toBeDefined()
    expect(z.array(z.string()).safeParse(result._jsonBody).success).toBeTrue()
})

test("Expect a post request that is authenticated and providing a body with derivation links that the cache does not already have to return the correct number of results with the correct nix store hashes", async () => {
    const request = createMockRequest();
    await new Derivations().insert({
        id: "n/a",
        signing_keys_id: signing_key,
        cderiver: "test",
        cstorehash: "volanta",
        cfilehash: "test",
        cfilesize: 0,
        cnarhash: "test",
        cnarsize: "0",
        compression: "xz",
        creferences: "test",
        csig: "test",
        cstoresuffix: "test",
        parts: "",
    }).then(async (res)=>{
        await new Derivation_tenant_link().insert({
            id: 'n/a',
            derivations_id: res,
            tenants_id: tenant_to_use
        });
    });    
    await new Derivations().insert({
        id: "n/a",
        signing_keys_id: signing_key,
        cderiver: "test",
        cstorehash: "solaar",
        cfilehash: "test",
        cfilesize: 0,
        cnarhash: "test",
        cnarsize: "0",
        compression: "xz",
        creferences: "test",
        csig: "test",
        cstoresuffix: "test",
        parts: "",
    }).then(async (res)=>{
        await new Derivation_tenant_link().insert({
            id: 'n/a',
            derivations_id: res,
            tenants_id: tenant_to_use
        })
    });

    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: tenant_to_use.name,
    };
    request.body = ["solaar", "volanta", "azure-cli"]
    const result = await run_endpoint(request, post)
    expect(result).toBeDefined()
    expect(result._status).toBe(200)
    expect(result._jsonBody).toBeDefined()
    expect(z.array(z.string()).safeParse(result._jsonBody).success).toBeTrue()
    expect((result._jsonBody as Array<string>).length).toBe(1)
    expect((result._jsonBody as Array<string>)[0]).toBe("azure-cli")
})

test("Expect a POST request that is unauthenticated to fail", async() => {
    const request = createMockRequest();
    request.headers = {
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: tenant_to_use.name,
    };
    request.body = [Bun.randomUUIDv7(), Bun.randomUUIDv7()]
    const result = await run_endpoint(request, post)
    expect(result).toBeDefined()
    expect(result._status).toBe(403)
    expect(result._jsonBody).toBeDefined()
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue()
})

test("Expect a POST request that is unauthenticated and presenting a malformed authentication header to fail", async() => {
    const request = createMockRequest();
    request.headers = {
        authorization: `Bearer`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: tenant_to_use.name,
    };
    request.body = [Bun.randomUUIDv7(), Bun.randomUUIDv7()]
    const result = await run_endpoint(request, post)
    expect(result).toBeDefined()
    expect(result._status).toBe(403)
    expect(result._jsonBody).toBeDefined()
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue()
})

test("Expect a POST request that is unauthenticated and presenting a header with an unrecognized auth token to fail", async() => {
    const request = createMockRequest();
    request.headers = {
        authorization: `Bearer ${Bun.randomUUIDv7()}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: tenant_to_use.name,
    };
    request.body = [Bun.randomUUIDv7(), Bun.randomUUIDv7()]
    const result = await run_endpoint(request, post)
    expect(result).toBeDefined()
    expect(result._status).toBe(401)
    expect(result._jsonBody).toBeDefined()
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue()
})

test("Expect a POST request that is referring to an unrecognized tenant to fail", async() => {
    const request = createMockRequest();
    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: Bun.randomUUIDv7(),
    };
    request.body = [Bun.randomUUIDv7(), Bun.randomUUIDv7()]
    const result = await run_endpoint(request, post)
    expect(result).toBeDefined()
    expect(result._status).toBe(404)
    expect(result._jsonBody).toBeDefined()
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue()
})

test("Expect a POST request that does not have the tenant param set to fail", async() => {
    const request = createMockRequest();
    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.body = [Bun.randomUUIDv7(), Bun.randomUUIDv7()]
    const result = await run_endpoint(request, post)
    expect(result).toBeDefined()
    expect(result._status).toBe(404)
    expect(result._jsonBody).toBeDefined()
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue()
})

test("Expect a POST request that is not in the correct format to fail", async() => {
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
        "some": "key",
        "nix_store_hashes": [Bun.randomUUIDv7()]
    } 
    const result = await run_endpoint(request, post)
    expect(result).toBeDefined()
    expect(result._status).toBe(400)
    expect(result._jsonBody).toBeDefined()
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue()
})

test("Expect a POST request that has an array of not only strings to fail", async() => {
    const request = createMockRequest();
    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: tenant_to_use.name,
    };
    request.body = [10, Bun.randomUUIDv7()] 
    const result = await run_endpoint(request, post)
    expect(result).toBeDefined()
    expect(result._status).toBe(400)
    expect(result._jsonBody).toBeDefined()
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue()
})

test("Expect a POST request that has no x-forwarded-for header set to fail", async() => {
    const request = createMockRequest();
    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: tenant_to_use.name,
    };
    request.body = [Bun.randomUUIDv7()] 
    const result = await run_endpoint(request, post)
    expect(result).toBeDefined()
    expect(result._status).toBe(403)
    expect(result._jsonBody).toBeDefined()
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue()
})
