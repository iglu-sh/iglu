import { expect, test } from "bun:test";
import type { NextFunction, Request, Response } from "express";
import { post } from "@/cache/routes/api/v2/deploy/activate";
import Deployment_keys from "@/shared/db/DAO/deployment_keys";
import Tenants from "@/shared/db/DAO/tenants";
import { hashApiKey } from "@/shared/utils/crypto/api_key_generation";
import { createMockRequest } from "@/shared/utils/expressUnitTests/createMockRequest";
import { createMockResponse } from "@/shared/utils/expressUnitTests/createMockResponse";
import { deploy_activate_response } from "@/shared/utils/zod/zod_cachix_schemas";
import { error_response_schema } from "@/shared/utils/zod/zod_rest_schemas";
import { setupDatabaseForCacheMockTesting } from "@/tests/cache/utils/setupDatabase";

await setupDatabaseForCacheMockTesting();

test("Expect a POST request to /api/v2/deploy/activate to fail when unauthenticated", async () => {
    const request_to_use = createMockRequest({
        method: "GET",
    });
    const response_to_use = createMockResponse();
    expect(post[3]).toBeDefined();

    const function_to_run = post[3] as unknown as
        | ((
              req: Request,
              res: Response,
              next: NextFunction,
              // biome-ignore lint/suspicious/noExplicitAny: Response is <any, Record> typed so ignoring
          ) => Promise<Response<any, Record<string, any>> | undefined>)
        // biome-ignore lint/suspicious/noExplicitAny: Response is <any, Record> typed so ignoring
        | ((req: Request, res: Response, next: NextFunction) => Promise<any>);
    await function_to_run(request_to_use, response_to_use, () => {});

    expect(response_to_use._status).toBe(401);
    expect(response_to_use._jsonBody).toBeDefined();
    const schema_parsed = error_response_schema.safeParse(response_to_use._jsonBody);
    expect(schema_parsed.success).toBeTrue();
});

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
await new Deployment_keys().insert({
    id: "n/a",
    tenants_id: tenant_to_use,
    type: "activate",
    hash: hashApiKey(auth_token),
    expires_at: 10,
    created_at: 11,
    name: "test deployment",
});

test("Expect a POST request to /api/v2/deploy/activate to succeed when authenticated", async () => {
    const request_to_use = createMockRequest({
        method: "GET",
        headers: {
            authorization: `Bearer ${auth_token}`,
        },
        body: {
            agents: {
                izanami: "/nix/store/something.nar",
            },
        },
    });
    const response_to_use = createMockResponse();
    expect(post[3]).toBeDefined();

    const function_to_run = post[3] as unknown as
        | ((
              req: Request,
              res: Response,
              next: NextFunction,
              // biome-ignore lint/suspicious/noExplicitAny: Response is <any, Record> typed so ignoring
          ) => Promise<Response<any, Record<string, any>> | undefined>)
        // biome-ignore lint/suspicious/noExplicitAny: Response is <any, Record> typed so ignoring
        | ((req: Request, res: Response, next: NextFunction) => Promise<any>);
    await function_to_run(request_to_use, response_to_use, () => {});

    expect(response_to_use._status).toBe(200);
    expect(response_to_use._jsonBody).toBeDefined();
    expect(deploy_activate_response.safeParse(response_to_use._jsonBody).success).toBeTrue();
});
