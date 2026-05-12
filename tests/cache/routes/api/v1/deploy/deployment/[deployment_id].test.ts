import { expect, test } from "bun:test";
import { createMockRequest } from "@/shared/utils/expressUnitTests/createMockRequest";
import { run_endpoint } from "@/tests/cache/utils/runEndpoint";
import {get} from '@/cache/routes/api/v1/deploy/deployment/[deployment_id]'
import { setupTenantStructure } from "@/tests/cache/utils/setupTenantStructure";
import { Agents, Agents_deployments_links, Deployment_keys, Deployments, Tenants } from "@/shared/db";
import { error_response_schema } from "@/shared/utils/zod/zod_rest_schemas";
import { deploy_info_schema, hashApiKey } from "@/shared/utils";

const {tenant_to_use} = await setupTenantStructure()

const activation_key = Bun.randomUUIDv7()
const agent_key = Bun.randomUUIDv7()
const deployment_key_to_use = await new Deployment_keys().insert({
    id: 'n/a',
    tenants_id: tenant_to_use,
    type: 'activate',
    hash: hashApiKey(activation_key),
    expires_at: -1,
    created_at: Date.now(),
    name: 'Iglu Test for Deployment v1 endpoint'
})
const agent_key_to_use = await new Deployment_keys().insert({
    id: 'n/a',
    tenants_id: tenant_to_use,
    type: 'agent',
    hash: hashApiKey(agent_key),
    expires_at: -1,
    created_at: Date.now(),
    name: 'Iglu Test for Deployment v1 endpoint'
})
const deployment_to_use = await new Deployments().insert({
    id: 'n/a',
    tenants_id: tenant_to_use,
    created_at: Date.now(),
    start_time: Date.now(),
    end_time: 0,
    status: 'InProgress',
    deploy_json: "",
    deployment_index: 1,
    key_used: deployment_key_to_use
})
const agent_to_use = await new Agents().insert({
    id: 'n/a',
    tenants_id: tenant_to_use,
    last_seen: Date.now(),
    version: "unknown",
    os: 'x86_64-linux',
    is_online: true,
    last_key_used: agent_key_to_use,
    name: "Testing client"
})
const agent_deployment_link_to_use = await new Agents_deployments_links().insert({
    id: 'n/a',
    agents_id: agent_to_use,
    deployments_id: deployment_to_use,
    log: "[]",
    started_at: Date.now(),
    finished_at: null,
    store_path: "/nix/store/volanta",
    closure_size: null,
    status: "InProgress"
})
test("Expect a GET request that is authenticated to work", async () =>{
    const request = createMockRequest();

    request.headers = {
        authorization: `Bearer ${activation_key}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        deployment_id: agent_deployment_link_to_use.id 
    }

    const result = await run_endpoint(request, get)
    expect(result).toBeDefined()
    expect(result._status).toBe(200)
    expect(result._jsonBody).toBeDefined()
    expect(deploy_info_schema.safeParse(result._jsonBody).success).toBeTrue()
})

test("Expect a GET request that is unauthenticated to fail", async () =>{
    const request = createMockRequest();

    request.headers = {
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        deployment_id: agent_deployment_link_to_use.id 
    }

    const result = await run_endpoint(request, get)
    expect(result).toBeDefined()
    expect(result._status).toBe(401)
    expect(result._jsonBody).toBeDefined()
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue()
})

test("Expect a GET request with a malformed auth header to fail", async () => {
    const request = createMockRequest();

    request.headers = {
        authorization: `Bearer${activation_key}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        deployment_id: agent_deployment_link_to_use.id 
    }

    const result = await run_endpoint(request, get)
    expect(result).toBeDefined()
    expect(result._status).toBe(401)
    expect(result._jsonBody).toBeDefined()
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue()
})

test("Expect a GET request with a non-existing authtoken to fail", async () => {
    const request = createMockRequest();

    request.headers = {
        authorization: `Bearer ${Bun.randomUUIDv7()}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        deployment_id: agent_deployment_link_to_use.id 
    }

    const result = await run_endpoint(request, get)
    expect(result).toBeDefined()
    expect(result._status).toBe(401)
    expect(result._jsonBody).toBeDefined()
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue()
})

test("Expect a GET request that referrs to a non-existant deployment to fail", async () => {
    const request = createMockRequest();

    request.headers = {
        authorization: `Bearer ${activation_key}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        deployment_id: Bun.randomUUIDv7() 
    }

    const result = await run_endpoint(request, get)
    expect(result).toBeDefined()
    expect(result._status).toBe(404)
    expect(result._jsonBody).toBeDefined()
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue()
})

test("Expect a GET request that is missing the x-forwarded-for header to fail", async () => {
    const request = createMockRequest();

    request.headers = {
        authorization: `Bearer ${activation_key}`,
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        deployment_id: agent_deployment_link_to_use.id 
    }

    const result = await run_endpoint(request, get)
    expect(result).toBeDefined()
    expect(result._status).toBe(403)
    expect(result._jsonBody).toBeDefined()
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue()
})

test("Expect a GET request that referrs to a deployment that the activation key isn't allowed to access to fail", async () => {
    const new_agent_key = Bun.randomUUIDv7()
    const new_activation_key = Bun.randomUUIDv7()

    const new_tenant = await new Tenants().insert({
        id: 'n/a',
        name: Bun.randomUUIDv7(),
        github_username: 'Boerg',
        is_public: true,
        permission: 'Read',
        preferred_compression_method: 'XZ',
        uri: '/test',
        priority: 1,
        ttl: 1
    })
    const deployment_key_in_test = await new Deployment_keys().insert({
        id: 'n/a',
        tenants_id: new_tenant,
        type: 'activate',
        hash: hashApiKey(new_activation_key),
        expires_at: -1,
        created_at: Date.now(),
        name: 'Iglu Test for Deployment v1 endpoint'
    })
    const agent_key_to_use_in_test = await new Deployment_keys().insert({
        id: 'n/a',
        tenants_id: new_tenant,
        type: 'agent',
        hash: hashApiKey(new_agent_key),
        expires_at: -1,
        created_at: Date.now(),
        name: 'Iglu Test for Deployment v1 endpoint'
    })
    const deployment_to_use_in_test = await new Deployments().insert({
        id: 'n/a',
        tenants_id: new_tenant,
        created_at: Date.now(),
        start_time: Date.now(),
        end_time: 0,
        status: 'InProgress',
        deploy_json: "",
        deployment_index: 1,
        key_used: deployment_key_in_test 
    })
    const agent_to_use_in_test = await new Agents().insert({
        id: 'n/a',
        tenants_id: new_tenant,
        last_seen: Date.now(),
        version: "unknown",
        os: 'x86_64-linux',
        is_online: true,
        last_key_used: agent_key_to_use_in_test,
        name: "Testing client"
    })
    const agent_deployment_link_to_use = await new Agents_deployments_links().insert({
        id: 'n/a',
        agents_id: agent_to_use_in_test,
        deployments_id: deployment_to_use_in_test,
        log: "[]",
        started_at: Date.now(),
        finished_at: null,
        store_path: "/nix/store/volanta",
        closure_size: null,
        status: "InProgress"
    })
    const request = createMockRequest();

    request.headers = {
        authorization: `Bearer ${activation_key}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        deployment_id: agent_deployment_link_to_use.id 
    }

    const result = await run_endpoint(request, get)
    expect(result).toBeDefined()
    expect(result._status).toBe(401)
    expect(result._jsonBody).toBeDefined()
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue()
})

