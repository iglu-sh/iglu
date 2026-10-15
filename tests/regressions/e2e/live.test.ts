/**
 * End-to-end regression tests against a RUNNING Iglu cache (see BUGS.md #1, #5, #6, #9, #10, #13)
 * These are expected to FAIL until the corresponding bug is fixed.
 *
 * They are skipped unless configured via environment variables:
 *   IGLU_E2E_URL          e.g. http://localhost:8080
 *   IGLU_E2E_API_KEY      an API key with access to IGLU_E2E_TENANT (it also needs to be allowed to create tenants)
 *   IGLU_E2E_TENANT       defaults to "default"
 *   IGLU_E2E_SIGNING_KEY  the cachix secret signing key matching the API key's public key
 *                         (only needed for the cachix tests, which also need `cachix` and `nix` in PATH)
 *
 * WARNING: these tests modify the server they run against: they push store paths and create/delete tenants.
 * Only run them against a development instance.
 * */
import { afterAll, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import path from "node:path";

const BASE_URL = process.env.IGLU_E2E_URL;
const API_KEY = process.env.IGLU_E2E_API_KEY;
const TENANT = process.env.IGLU_E2E_TENANT ?? "default";
const SIGNING_KEY = process.env.IGLU_E2E_SIGNING_KEY;

const has_server = !!BASE_URL && !!API_KEY;
const has_cachix = has_server && !!SIGNING_KEY && !!Bun.which("cachix") && !!Bun.which("nix");

const auth = { authorization: `Bearer ${API_KEY}` };
const work_dir = fs.mkdtempSync(path.join(os.tmpdir(), "iglu-e2e-"));
const created_tenants: Array<string> = [];

afterAll(async () => {
    for (const name of created_tenants) {
        await fetch(`${BASE_URL}/api/v1/iglu/rest/tenants/${encodeURIComponent(name)}`, {
            method: "DELETE",
            headers: auth,
        });
    }
    fs.rmSync(work_dir, { recursive: true, force: true });
});

async function createTenant(): Promise<string> {
    const name = `e2e-${Bun.randomUUIDv7()}`;
    const response = await fetch(`${BASE_URL}/api/v1/iglu/rest/tenants`, {
        method: "POST",
        headers: { ...auth, "content-type": "application/json" },
        body: JSON.stringify({
            id: "ignored",
            github_username: "e2e",
            name,
            permission: "Read",
            is_public: true,
            preferred_compression_method: "zstd",
            uri: "ignored",
            priority: 50,
            ttl: 3600,
            signing_method: "client",
        }),
    });
    expect(response.status).toBe(201);
    created_tenants.push(name);
    return name;
}

/**
 * @description Adds a unique file to the local nix store and returns its store path
 * */
function makeStorePath(label: string): string {
    const file = path.join(work_dir, `${label}.txt`);
    fs.writeFileSync(file, `iglu e2e ${label} ${Bun.randomUUIDv7()}\n`);
    const result = Bun.spawnSync([
        "nix",
        "--extra-experimental-features",
        "nix-command",
        "store",
        "add-file",
        file,
    ]);
    expect(result.exitCode).toBe(0);
    return result.stdout.toString().trim();
}

/**
 * @description Runs `cachix push` with an isolated config directory so the user's cachix config is untouched
 * */
async function cachixPush(tenant: string, store_path: string, extra_args: Array<string> = []) {
    const proc = Bun.spawn(
        ["cachix", "--hostname", BASE_URL as string, "push", ...extra_args, tenant, store_path],
        {
            env: {
                ...process.env,
                XDG_CONFIG_HOME: path.join(work_dir, "xdg"),
                CACHIX_AUTH_TOKEN: API_KEY,
                CACHIX_SIGNING_KEY: SIGNING_KEY,
            },
            stdout: "pipe",
            stderr: "pipe",
        },
    );
    const exit_code = await proc.exited;
    return { exit_code, stderr: await new Response(proc.stderr).text() };
}

function storeHash(store_path: string): string {
    return path.basename(store_path).split("-")[0] as string;
}

describe.skipIf(!has_server)("e2e: plain HTTP", () => {
    test("BUGS.md #9: nix-cache-info has a valid Priority line", async () => {
        const response = await fetch(`${BASE_URL}/${TENANT}/nix-cache-info`);
        expect(response.status).toBe(200);
        expect(await response.text()).toMatch(/^Priority: \d+$/m);
    });

    test("BUGS.md #13: malformed JSON returns a JSON error without a stack trace", async () => {
        const response = await fetch(`${BASE_URL}/api/v1/cache/${TENANT}/narinfo`, {
            method: "POST",
            headers: { ...auth, "content-type": "application/json" },
            body: "[1,2",
        });
        expect(response.status).toBe(400);
        expect(response.headers.get("content-type")).toContain("application/json");
        const body = await response.text();
        expect(body).not.toContain("SyntaxError");
        expect(body).not.toContain("node_modules");
    });

    test("BUGS.md #5: X-Forwarded-For from an untrusted peer is ignored", async () => {
        const tenant = await createTenant();
        // Drop a documentation range (TEST-NET-3) that the test client is definitely not part of
        const rule = await fetch(
            `${BASE_URL}/api/v1/iglu/rest/tenants/${tenant}/access_rules?confirm=true`,
            {
                method: "POST",
                headers: { ...auth, "content-type": "application/json" },
                body: JSON.stringify({
                    ip_block: "203.0.113.0/24",
                    priority: -100,
                    action: "drop",
                    name: "e2e drop TEST-NET-3",
                }),
            },
        );
        expect(rule.status).toBe(201);

        // If the server trusts the header, claiming to be 203.0.113.5 gets us blocked
        const response = await fetch(`${BASE_URL}/${tenant}/nix-cache-info`, {
            headers: { "x-forwarded-for": "203.0.113.5" },
        });
        expect(response.status).toBe(200);
    });
});

describe.skipIf(!has_cachix)("e2e: cachix", () => {
    test("BUGS.md #1 / #10: concurrent pushes of the same path leave it servable", async () => {
        const store_path = makeStorePath("concurrent");
        const results = await Promise.all([
            cachixPush(TENANT, store_path),
            cachixPush(TENANT, store_path),
            cachixPush(TENANT, store_path),
        ]);
        for (const result of results) {
            expect(result.exit_code).toBe(0);
        }

        const response = await fetch(`${BASE_URL}/${TENANT}/${storeHash(store_path)}.narinfo`);
        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toContain("text/x-nix-narinfo");
        expect(await response.text()).toContain(`StorePath: ${store_path}`);
    }, 120_000);

    test("BUGS.md #6: pushing the same path to another tenant does not change the first tenant's file", async () => {
        const other_tenant = await createTenant();
        const store_path = makeStorePath("overwrite");
        const hash = storeHash(store_path);

        expect((await cachixPush(TENANT, store_path, ["-l", "2"])).exit_code).toBe(0);
        // A different compression level produces a different compressed file for the same store path
        expect((await cachixPush(other_tenant, store_path, ["-l", "16"])).exit_code).toBe(0);

        const narinfo = await (await fetch(`${BASE_URL}/${TENANT}/${hash}.narinfo`)).text();
        const advertised = narinfo.match(/^FileHash: sha256:([0-9a-f]{64})$/m)?.[1];
        expect(advertised).toBeDefined();

        // Follows the S3 redirect if there is one
        const nar = await fetch(`${BASE_URL}/${TENANT}/nar/${hash}`);
        expect(nar.status).toBe(200);
        const actual = new Bun.CryptoHasher("sha256")
            .update(new Uint8Array(await nar.arrayBuffer()))
            .digest("hex");
        expect(actual).toBe(advertised as string);
    }, 120_000);
});
