/**
 * Regression tests for the nix-facing endpoints (see BUGS.md #1, #3, #9, #10, #26)
 * These are expected to FAIL until the corresponding bug is fixed.
 * */
import { describe, expect, test } from "bun:test";
import {
    get as narinfo_get,
    openapi as narinfo_openapi,
} from "@/cache/routes/[tenant]/[hash].narinfo";
import { get as nix_cache_info_get } from "@/cache/routes/[tenant]/nix-cache-info";
import { post as key_post } from "@/cache/routes/api/v1/cache/[tenant]/key";
import { post as narinfo_post } from "@/cache/routes/api/v1/cache/[tenant]/narinfo";
import { Derivation_tenant_link } from "@/shared/db";
import type { signing_key } from "@/shared/types/schema";
import { createMockRequest } from "@/shared/utils/expressUnitTests/createMockRequest";
import { run_endpoint } from "@/tests/cache/utils/runEndpoint";
import {
    headers,
    linkDerivation,
    makeApiKey,
    makeDerivation,
    makeEd25519Keypair,
    makeTenant,
} from "./utils";

async function getNarinfo(tenant_name: string, hash: string) {
    const request = createMockRequest({
        headers: headers(),
        params: { tenant: tenant_name, hash },
    });
    return await run_endpoint(request, narinfo_get);
}

describe("BUGS.md #9: nix-cache-info format", () => {
    test("Priority line uses the 'Key: value' format", async () => {
        const tenant = await makeTenant({ priority: 42 });
        const request = createMockRequest({
            headers: headers(),
            params: { tenant: tenant.name },
        });
        const result = await run_endpoint(request, nix_cache_info_get);
        expect(result._status).toBe(200);
        const lines = (result._body as string).split("\n");
        expect(lines).toContain("Priority: 42");
        // Every non-empty line has to be "Key: value", otherwise nix ignores it
        for (const line of lines.filter((l) => l.length > 0)) {
            expect(line).toMatch(/^[A-Za-z]+: .+$/);
        }
    });
});

describe("BUGS.md #10: narinfo content-type", () => {
    test("narinfo is served as text/x-nix-narinfo", async () => {
        const tenant = await makeTenant();
        const { signing_key } = await makeApiKey([tenant], "AAAA");
        const derivation = await makeDerivation();
        await linkDerivation(derivation, tenant, signing_key as signing_key);

        const result = await getNarinfo(tenant.name, derivation.cstorehash);
        expect(result._status).toBe(200);
        expect(result._headers["content-type"]).toBe("text/x-nix-narinfo");
    });
});

describe("BUGS.md #26: openapi path of the narinfo route", () => {
    test("openapi path does not contain the .ts file extension", () => {
        expect(narinfo_openapi.meta.path).toBe("/{tenant}/{hash}.narinfo");
    });
});

describe("BUGS.md #1: duplicate derivation_tenant_links", () => {
    test("linking the same derivation to the same tenant twice does not create a second link", async () => {
        const tenant = await makeTenant();
        const { signing_key } = await makeApiKey([tenant], "AAAA");
        const derivation = await makeDerivation();
        await linkDerivation(derivation, tenant, signing_key as signing_key);
        try {
            // Simulates a second (concurrent) complete.ts call for the same store path
            await linkDerivation(derivation, tenant, signing_key as signing_key);
        } catch (_e) {
            // A unique constraint rejecting the insert is an acceptable fix
        }

        const links = await new Derivation_tenant_link().getByNixStoreHashesAndTenant(
            [derivation.cstorehash],
            tenant.id,
        );
        expect(links.length).toBe(1);
    });

    test("if POST /narinfo reports a hash as present, GET /<hash>.narinfo serves it", async () => {
        const tenant = await makeTenant();
        const { signing_key, auth_token } = await makeApiKey([tenant], "AAAA");
        const derivation = await makeDerivation();
        await linkDerivation(derivation, tenant, signing_key as signing_key);
        try {
            await linkDerivation(derivation, tenant, signing_key as signing_key);
        } catch (_e) {
            // see above
        }

        const missing = await run_endpoint(
            createMockRequest({
                headers: headers(auth_token),
                params: { tenant: tenant.name },
                body: [derivation.cstorehash],
            }),
            narinfo_post,
        );
        expect(missing._status).toBe(200);
        const reported_present = !(missing._jsonBody as Array<string>).includes(
            derivation.cstorehash,
        );

        const narinfo = await getNarinfo(tenant.name, derivation.cstorehash);
        // cachix will never re-upload something reported as present, so it has to be servable
        if (reported_present) {
            expect(narinfo._status).toBe(200);
        }
    });
});

describe("BUGS.md #3: signing key upload", () => {
    test.each([
        ["not-a-key"],
        [""],
        ["AAAA"], // valid base64 but only 3 bytes
        [Buffer.alloc(64).toString("base64")], // 64 bytes is a private key, not a public key
        ["%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%="],
    ])("rejects invalid public key %p with 400", async (public_key) => {
        const tenant = await makeTenant();
        const original = await makeEd25519Keypair();
        const { auth_token } = await makeApiKey([tenant], original.public_key);

        const result = await run_endpoint(
            createMockRequest({
                headers: headers(auth_token),
                params: { tenant: tenant.name },
                body: { publicKey: public_key },
            }),
            key_post,
        );
        expect(result._status).toBe(400);
    });

    test("accepts a valid 32 byte ed25519 public key", async () => {
        const tenant = await makeTenant();
        const { auth_token } = await makeApiKey([tenant]);
        const keypair = await makeEd25519Keypair();

        const result = await run_endpoint(
            createMockRequest({
                headers: headers(auth_token),
                params: { tenant: tenant.name },
                body: { publicKey: keypair.public_key },
            }),
            key_post,
        );
        expect(result._status).toBe(200);
    });
});
