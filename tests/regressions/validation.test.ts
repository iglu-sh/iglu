/**
 * Regression tests for input validation (see BUGS.md #7, #14, #29)
 * These are expected to FAIL until the corresponding bug is fixed.
 * */
import { describe, expect, test } from "bun:test";
import { post as access_rule_post } from "@/cache/routes/api/v1/iglu/rest/tenants/[tenant]/access_rules/index";
import { patch as tenant_patch } from "@/cache/routes/api/v1/iglu/rest/tenants/[tenant]/index";
import { post as tenant_post } from "@/cache/routes/api/v1/iglu/rest/tenants/index";
import { createMockRequest } from "@/shared/utils/expressUnitTests/createMockRequest";
import { cidr_to_range } from "@/shared/utils/ip";
import { run_endpoint } from "@/tests/cache/utils/runEndpoint";
import { headers, makeApiKey, makeTenant } from "./utils";

describe("BUGS.md #7: cidr_to_range", () => {
    test.each([
        // [cidr, start, end]
        ["0.0.0.0/0", 0, 4294967295],
        ["10.0.0.0/0", 0, 4294967295],
        ["192.168.1.1/0", 0, 4294967295],
        ["128.0.0.0/1", 2147483648, 4294967295],
        ["10.1.2.3/8", 167772160, 184549375],
        ["192.168.1.0/24", 3232235776, 3232236031],
        ["10.0.0.0/31", 167772160, 167772161],
        ["1.2.3.4/32", 16909060, 16909060],
        ["255.255.255.255/32", 4294967295, 4294967295],
    ])("%p covers %p - %p", (cidr, start, end) => {
        expect(cidr_to_range(cidr)).toEqual({ range_start: start, range_end: end });
    });

    test.each([
        ["10.0.0.0/33"],
        ["10.0.0.0/99"],
        ["10.0.0.0/-1"],
        ["10.0.0.0/abc"],
        ["10.0.0.0/"],
        ["999.1.1.1/32"],
        ["1.2.3/24"],
        ["a.b.c.d/8"],
        ["garbage"],
    ])("%p is rejected", (cidr) => {
        expect(() => cidr_to_range(cidr)).toThrow();
    });

    test("an invalid ip_block in the REST API returns 422 instead of crashing", async () => {
        const tenant = await makeTenant();
        const { auth_token } = await makeApiKey([tenant]);
        const result = await run_endpoint(
            createMockRequest({
                headers: headers(auth_token),
                params: { tenant: tenant.name },
                query: {},
                body: { ip_block: "garbage", priority: 5, action: "accept", name: "regression" },
            }),
            access_rule_post,
        );
        expect(result._status).toBe(422);
    });

    test.each([
        ["10.0.0.0/33"],
        ["10.0.0.0/99"],
        ["999.1.1.1/32"],
    ])("the REST API rejects ip_block %p with 422", async (ip_block) => {
        const tenant = await makeTenant();
        const { auth_token } = await makeApiKey([tenant]);
        const result = await run_endpoint(
            createMockRequest({
                headers: headers(auth_token),
                params: { tenant: tenant.name },
                query: {},
                body: { ip_block, priority: 5, action: "accept", name: "regression" },
            }),
            access_rule_post,
        );
        expect(result._status).toBe(422);
    });
});

describe("BUGS.md #14 / #29: tenant validation", () => {
    function tenantBody(overrides: Record<string, unknown> = {}) {
        return {
            id: "ignored",
            github_username: "regression",
            name: `regression-${Bun.randomUUIDv7()}`,
            permission: "Read",
            is_public: true,
            preferred_compression_method: "zstd",
            uri: "ignored",
            priority: 1,
            ttl: 3600,
            signing_method: "client",
            ...overrides,
        };
    }

    test("control: a valid tenant can be created", async () => {
        const tenant = await makeTenant();
        const { auth_token } = await makeApiKey([tenant]);
        const result = await run_endpoint(
            createMockRequest({ headers: headers(auth_token), body: tenantBody() }),
            tenant_post,
        );
        expect(result._status).toBe(201);
    });

    test.each([
        ["empty name", { name: "" }],
        ["name with a slash", { name: "bad/name" }],
        ["name with path traversal", { name: "../x" }],
        ["name with whitespace", { name: "bad name" }],
        ["reserved name 'api'", { name: "api" }],
        ["reserved name 'public'", { name: "public" }],
        ["reserved name 'ws'", { name: "ws" }],
        ["unknown compression", { preferred_compression_method: "bogus" }],
        ["negative ttl", { ttl: -100 }],
        ["zero ttl", { ttl: 0 }],
        ["negative priority", { priority: -5 }],
        ["non integer priority", { priority: 1.5 }],
    ])("creating a tenant with %s is rejected with 422", async (_label, overrides) => {
        const tenant = await makeTenant();
        const { auth_token } = await makeApiKey([tenant]);
        const result = await run_endpoint(
            createMockRequest({ headers: headers(auth_token), body: tenantBody(overrides) }),
            tenant_post,
        );
        expect(result._status).toBe(422);
    });

    test.each([
        ["empty name", { name: "" }],
        ["name with a slash", { name: "bad/name" }],
        ["unknown compression", { preferred_compression_method: "bogus" }],
        ["negative ttl", { ttl: -100 }],
    ])("updating a tenant with %s is rejected with 422", async (_label, overrides) => {
        const tenant = await makeTenant();
        const { auth_token } = await makeApiKey([tenant]);
        const result = await run_endpoint(
            createMockRequest({
                headers: headers(auth_token),
                params: { tenant: tenant.name },
                body: tenantBody({ name: tenant.name, ...overrides }),
            }),
            tenant_patch,
        );
        expect(result._status).toBe(422);
    });
});
