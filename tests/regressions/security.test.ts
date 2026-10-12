/**
 * Regression tests for authentication / authorization issues (see BUGS.md #4, #5, #8, #18, #19, #21, #30)
 * These are expected to FAIL until the corresponding bug is fixed.
 * */
import { describe, expect, test } from "bun:test";
import path from "node:path";
import type { NextFunction, Request, Response } from "express";
import { get as info_page_get } from "@/cache/routes/[tenant]/index";
import { get as nix_cache_info_get } from "@/cache/routes/[tenant]/nix-cache-info";
import { post as create_key_post } from "@/cache/routes/api/v1/iglu/rest/keys/auth/index";
import { patch as modify_key_patch } from "@/cache/routes/api/v1/iglu/rest/keys/auth/modify";
import { post as activate_post } from "@/cache/routes/api/v2/deploy/activate";
import { Api_keys, Api_keys_tenants_link, Deployment_keys } from "@/shared/db";
import { Configuration } from "@/shared/utils/cache/Configuration";
import { hashApiKey } from "@/shared/utils/crypto/api_key_generation";
import { createMockRequest } from "@/shared/utils/expressUnitTests/createMockRequest";
import { createMockResponse } from "@/shared/utils/expressUnitTests/createMockResponse";
import Authentication from "@/shared/utils/rest/Authentication";
import { run_endpoint } from "@/tests/cache/utils/runEndpoint";
import { addAccessRule, headers, makeApiKey, makeTenant } from "./utils";

describe("BUGS.md #4: modifying other API keys", () => {
    test("a key cannot modify a key that has access to tenants it does not control", async () => {
        const attacker_tenant = await makeTenant();
        const victim_tenant = await makeTenant();
        const attacker = await makeApiKey([attacker_tenant]);
        const victim = await makeApiKey([victim_tenant]);

        const result = await run_endpoint(
            createMockRequest({
                headers: headers(attacker.auth_token),
                body: {
                    id: victim.api_key.id,
                    name: "pwned",
                    tenants: [attacker_tenant.id],
                },
            }),
            modify_key_patch,
        );
        expect([401, 403]).toContain(result._status as number);

        // The victim key must be untouched
        const victim_after = await new Api_keys().getById(victim.api_key.id);
        expect(victim_after?.name).toBe(victim.api_key.name);
        const victim_tenants = (
            await new Api_keys_tenants_link().getByApiKey(victim.api_key.id)
        ).map((x) => x.tenants_id.id);
        expect(victim_tenants).toEqual([victim_tenant.id]);
    });

    test("a key can still rename itself", async () => {
        const tenant = await makeTenant();
        const key = await makeApiKey([tenant]);

        const result = await run_endpoint(
            createMockRequest({
                headers: headers(key.auth_token),
                body: { id: key.api_key.id, name: "renamed", tenants: [tenant.id] },
            }),
            modify_key_patch,
        );
        expect(result._status).toBe(200);
        expect((await new Api_keys().getById(key.api_key.id))?.name).toBe("renamed");
    });
});

describe("BUGS.md #5: X-Forwarded-For spoofing", () => {
    async function requestFrom(tenant_name: string, socket_ip: string, xff?: string) {
        const request = createMockRequest({
            headers: {
                "user-agent": "iglu-sh regression tests",
                ...(xff !== undefined ? { "x-forwarded-for": xff } : {}),
            },
            params: { tenant: tenant_name },
            socket: { remoteAddress: socket_ip } as Request["socket"],
        });
        return await run_endpoint(request, nix_cache_info_get);
    }

    test("control: a blocked peer without X-Forwarded-For is rejected", async () => {
        const tenant = await makeTenant();
        await addAccessRule(tenant, "10.0.0.0/8", "drop", -100);
        expect((await requestFrom(tenant.name, "10.0.0.5"))._status).toBe(403);
    });

    test("a blocked peer cannot bypass a drop rule by sending X-Forwarded-For", async () => {
        const tenant = await makeTenant();
        await addAccessRule(tenant, "10.0.0.0/8", "drop", -100);
        expect((await requestFrom(tenant.name, "10.0.0.5", "8.8.8.8"))._status).toBe(403);
    });

    test("a blocked peer cannot bypass a drop rule with a garbage X-Forwarded-For", async () => {
        const tenant = await makeTenant();
        await addAccessRule(tenant, "10.0.0.0/8", "drop", -100);
        expect((await requestFrom(tenant.name, "10.0.0.5", "lol"))._status).toBe(403);
    });
});

describe("BUGS.md #8: info page HTML injection", () => {
    test("tenant values are HTML escaped on the info page", async () => {
        const payload = "<img src=x onerror=alert(document.domain)>";
        const tenant = await makeTenant({ github_username: payload });

        const request = createMockRequest({
            headers: headers(),
            params: { tenant: tenant.name },
        });
        const response = createMockResponse();
        // The info page uses res.setHeaders which the shared mock does not implement
        (response as unknown as { setHeaders: () => Response }).setHeaders = () => response;

        // The handler reads info.html relative to the cwd of the cache
        const previous_cwd = process.cwd();
        process.chdir(path.join(import.meta.dir, "../../cache"));
        try {
            for (const handler of info_page_get as Array<
                (req: Request, res: Response, next: NextFunction) => unknown
            >) {
                const value = await handler(request, response, () => {});
                if (value !== undefined) break;
            }
        } finally {
            process.chdir(previous_cwd);
        }

        expect(response._status).toBe(200);
        const html = response._body as string;
        expect(html).not.toContain(payload);
        expect(html).toContain("&lt;img src=x onerror=alert(document.domain)&gt;");
    });
});

describe("BUGS.md #18: deployment key expiry", () => {
    test("an expired activation key cannot activate deployments", async () => {
        const tenant = await makeTenant();
        const token = Bun.randomUUIDv7();
        await new Deployment_keys().insert({
            id: "n/a",
            tenants_id: tenant,
            type: "activate",
            hash: hashApiKey(token),
            expires_at: Date.now() - 60 * 1000, // expired a minute ago (ms, like startup.ts)
            created_at: Date.now() - 120 * 1000,
            name: "expired regression key",
        });

        const result = await run_endpoint(
            createMockRequest({
                headers: headers(token),
                body: { agents: { regression: "/nix/store/regression" } },
            }),
            activate_post,
        );
        expect(result._status).toBe(401);
    });
});

describe("BUGS.md #19: API key format", () => {
    test("newly created API keys are not UUIDs and have at least 256 bits of randomness", async () => {
        const tenant = await makeTenant();
        const creator = await makeApiKey([tenant]);

        const result = await run_endpoint(
            createMockRequest({
                headers: headers(creator.auth_token),
                body: { name: "regression", tenants: [tenant.id] },
            }),
            create_key_post,
        );
        expect(result._status).toBe(200);
        const data = (result._jsonBody as { data: { id: string; key: string } }).data;
        expect(data.key).not.toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        );
        // 32 random bytes as base64url are 43 characters
        expect(data.key.length).toBeGreaterThanOrEqual(43);
        // The key must not share its timestamp prefix with its public id
        expect(data.key.slice(0, 13)).not.toBe(data.id.slice(0, 13));
    });
});

describe("BUGS.md #21: Authorization header parsing", () => {
    const final_handler = (_req: Request, res: Response) => res.status(200).send("ok");

    test("a header that only contains 'Bearer' somewhere is rejected", async () => {
        const tenant = await makeTenant();
        const { auth_token } = await makeApiKey([tenant]);
        const result = await run_endpoint(
            createMockRequest({
                headers: { authorization: `xx ${auth_token} Bearer` },
                params: { tenant: tenant.name },
            }),
            [Authentication(), final_handler],
        );
        expect([401, 403]).toContain(result._status as number);
    });

    test("the bearer scheme is case insensitive (RFC 7235)", async () => {
        const tenant = await makeTenant();
        const { auth_token } = await makeApiKey([tenant]);
        const result = await run_endpoint(
            createMockRequest({
                headers: { authorization: `bearer ${auth_token}` },
                params: { tenant: tenant.name },
            }),
            [Authentication(), final_handler],
        );
        expect(result._status).toBe(200);
    });
});

describe("BUGS.md #30: API key hashing ignores the configured hashing_secret", () => {
    test("changing server.hashing_secret changes the API key hash", () => {
        const server_config = Configuration.getConfig().server;
        const original_secret = server_config.hashing_secret;
        try {
            server_config.hashing_secret = "secret-one";
            const hash_one = hashApiKey("same-api-key");
            server_config.hashing_secret = "secret-two";
            const hash_two = hashApiKey("same-api-key");
            expect(hash_one).not.toBe(hash_two);
        } finally {
            server_config.hashing_secret = original_secret;
        }
    });
});
