import { expect, test } from "bun:test";
import { AgentWebSocketManager } from "@/cache/lib/WebSocketManager";
import { post } from "@/cache/routes/api/v2/deploy/activate";
import { Agents } from "@/shared/db";
import { Deployment_keys } from "@/shared/db/DAO/deployment_keys";
import { hashApiKey } from "@/shared/utils/crypto/api_key_generation";
import { createMockRequest } from "@/shared/utils/expressUnitTests/createMockRequest";
import { error_response_schema } from "@/shared/utils/zod/rest/base_rest_schemas";
import { deploy_activate_response } from "@/shared/utils/zod/zod_cachix_schemas";
import { run_endpoint } from "@/tests/cache/utils/runEndpoint";
import { setupTenantStructure } from "@/tests/cache/utils/setupTenantStructure";

const { tenant_to_use, auth_token } = await setupTenantStructure();
await new Deployment_keys().insert({
    id: "n/a",
    tenants_id: tenant_to_use,
    type: "activate",
    hash: hashApiKey(auth_token),
    expires_at: 10,
    created_at: 11,
    name: "test deployment",
});

const agent_key_to_use = await new Deployment_keys().insert({
    id: "n/a",
    tenants_id: tenant_to_use,
    type: "agent",
    hash: hashApiKey(Bun.randomUUIDv7()),
    expires_at: -1,
    created_at: Date.now(),
    name: "Iglu Test for Deployment v1 endpoint",
});
const agent_to_use = await new Agents().insert({
    id: "n/a",
    tenants_id: tenant_to_use,
    last_seen: Date.now(),
    version: "unknown",
    os: "x86_64-linux",
    is_online: true,
    last_key_used: agent_key_to_use,
    name: "izanami",
});

test("Expect a POST request to /api/v2/deploy/activate to succeed when authenticated", async () => {
    AgentWebSocketManager.storeWebSocketForTenant(tenant_to_use.id, agent_to_use, {
        send: () => {
            /*This is just here so that the websocket can be "called"*/
        },
    } as unknown as WebSocket);
    const request_to_use = createMockRequest({
        method: "GET",
        headers: {
            authorization: `Bearer ${auth_token}`,
            "x-forwarded-for": "10.0.0.1",
            "user-agent": "iglu-sh testing client",
        },
        body: {
            agents: {
                izanami: "/nix/store/something.nar",
            },
        },
    });
    const result = await run_endpoint(request_to_use, post);
    expect(result._status).toBe(200);
    expect(result._jsonBody).toBeDefined();
    expect(deploy_activate_response.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a POST request to /api/v2/deploy/activate to fail when missing an auth header", async () => {
    const request_to_use = createMockRequest({
        method: "GET",
        headers: {
            "x-forwarded-for": "10.0.0.1",
            "user-agent": "iglu-sh testing client",
        },
        body: {
            agents: {
                izanami: "/nix/store/something.nar",
            },
        },
    });

    const result = await run_endpoint(request_to_use, post);
    expect(result._status).toBe(401);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a POST request to /api/v2/deploy/activate to fail when using a malformed auth header", async () => {
    const request_to_use = createMockRequest({
        method: "GET",
        headers: {
            authorization: `Bearer${auth_token}`,
            "x-forwarded-for": "10.0.0.1",
            "user-agent": "iglu-sh testing client",
        },
        body: {
            agents: {
                izanami: "/nix/store/something.nar",
            },
        },
    });

    const result = await run_endpoint(request_to_use, post);
    expect(result._status).toBe(401);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a POST request to /api/v2/deploy/activate to fail when using an unrecognized auth token", async () => {
    const request_to_use = createMockRequest({
        method: "GET",
        headers: {
            authorization: `Bearer ${Bun.randomUUIDv7()}`,
            "x-forwarded-for": "10.0.0.1",
            "user-agent": "iglu-sh testing client",
        },
        body: {
            agents: {
                izanami: "/nix/store/something.nar",
            },
        },
    });

    const result = await run_endpoint(request_to_use, post);
    expect(result._status).toBe(401);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a POST request to /api/v2/deploy/activate to fail when a malformed body was provided", async () => {
    const request_to_use = createMockRequest({
        method: "GET",
        headers: {
            authorization: `Bearer ${auth_token}`,
            "x-forwarded-for": "10.0.0.1",
            "user-agent": "iglu-sh testing client",
        },
        body: {
            agents_invalid: {
                izanami: "/nix/store/something.nar",
            },
        },
    });

    const result = await run_endpoint(request_to_use, post);
    expect(result._status).toBe(401);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a POST request to /api/v2/deploy/activate to fail when missing the x-forwarded-for header", async () => {
    const request_to_use = createMockRequest({
        method: "GET",
        headers: {
            authorization: `Bearer ${auth_token}`,
            "user-agent": "iglu-sh testing client",
        },
        body: {
            agents: {
                izanami: "/nix/store/something.nar",
            },
        },
    });

    const result = await run_endpoint(request_to_use, post);
    expect(result._status).toBe(403);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a POST request to /api/v2/deploy/activate to return an emty object when trying to activate agents from other tenants", async () => {
    const { tenant_to_use } = await setupTenantStructure();
    const agent_key_to_use_new = await new Deployment_keys().insert({
        id: "n/a",
        tenants_id: tenant_to_use,
        type: "agent",
        hash: hashApiKey(Bun.randomUUIDv7()),
        expires_at: -1,
        created_at: Date.now(),
        name: "Iglu Test for Deployment v1 endpoint",
    });
    await new Agents().insert({
        id: "n/a",
        tenants_id: tenant_to_use,
        last_seen: Date.now(),
        version: "unknown",
        os: "x86_64-linux",
        is_online: true,
        last_key_used: agent_key_to_use_new,
        name: "bergusia",
    });
    const request_to_use = createMockRequest({
        method: "GET",
        headers: {
            authorization: `Bearer ${auth_token}`,
            "x-forwarded-for": "10.0.0.1",
            "user-agent": "iglu-sh testing client",
        },
        body: {
            agents: {
                bergusia: "/nix/store/something.nar",
            },
        },
    });

    const result = await run_endpoint(request_to_use, post);
    expect(result._status).toBe(200);
    expect(result._jsonBody).toBeDefined();
    expect(deploy_activate_response.safeParse(result._jsonBody).success).toBeTrue();
    expect(JSON.stringify(deploy_activate_response.safeParse(result._jsonBody).data?.agents)).toBe(
        "{}",
    );
});
