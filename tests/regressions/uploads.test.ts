/**
 * Regression tests for the cachix upload flow with filesystem storage (see BUGS.md #15, #16, #17, #20, #22, #23)
 * These are expected to FAIL until the corresponding bug is fixed.
 * */
import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import type { Writable } from "node:stream";
import { post as uid_post } from "@/cache/routes/api/v1/cache/[tenant]/multipart-nar/[uid]";
import { post as complete_post } from "@/cache/routes/api/v1/cache/[tenant]/multipart-nar/[uid]/complete";
import { put as upload_put } from "@/cache/routes/api/v1/iglu/upload/[tenant]/[uid]";
import { Derivation_tenant_link } from "@/shared/db";
import { createMockRequest } from "@/shared/utils/expressUnitTests/createMockRequest";
import { run_endpoint } from "@/tests/cache/utils/runEndpoint";
import {
    headers,
    makeApiKey,
    makeCompleteBody,
    makeEd25519Keypair,
    makeTenant,
    makeUploadWithPart,
    randomStoreHash,
} from "./utils";

function randomContent(): Buffer {
    const buffer = Buffer.alloc(64 * 1024);
    crypto.getRandomValues(buffer);
    return buffer;
}

describe("BUGS.md #15: pushing an already stored path (filesystem storage)", () => {
    test("the same store path can be pushed to a second tenant", async () => {
        const keypair = await makeEd25519Keypair();
        const tenant_a = await makeTenant();
        const tenant_b = await makeTenant();
        const { api_key, auth_token } = await makeApiKey([tenant_a, tenant_b], keypair.public_key);
        const content = randomContent();
        const store_hash = randomStoreHash();

        for (const tenant of [tenant_a, tenant_b]) {
            const { upload, file_hash, file_size } = await makeUploadWithPart(
                tenant,
                api_key,
                content,
            );
            const result = await run_endpoint(
                createMockRequest({
                    headers: headers(auth_token),
                    params: { tenant: tenant.name, uid: upload.id },
                    body: await makeCompleteBody(
                        keypair,
                        store_hash,
                        "regression",
                        file_hash,
                        file_size,
                    ),
                }),
                complete_post,
            );
            expect(result._status).toBe(200);

            const links = await new Derivation_tenant_link().getByNixStoreHashesAndTenant(
                [store_hash],
                tenant.id,
            );
            expect(links.length).toBe(1);
        }
    });
});

describe("BUGS.md #16: client controlled file names", () => {
    test.each([
        // [store hash, store suffix]
        ["../iglu-regression/traversal", "regression"],
        [randomStoreHash(), "../../iglu-regression/traversal"],
        [randomStoreHash(), "has/slash"],
        ["not-a-store-hash", "regression"],
        [randomStoreHash(), ""],
    ])("rejects store hash %p / suffix %p with 400", async (store_hash, store_suffix) => {
        fs.rmSync("/tmp/iglu-regression/traversal-regression.xz", { force: true });
        const keypair = await makeEd25519Keypair();
        const tenant = await makeTenant();
        const { api_key, auth_token } = await makeApiKey([tenant], keypair.public_key);
        const { upload, file_hash, file_size } = await makeUploadWithPart(
            tenant,
            api_key,
            randomContent(),
        );

        // The body is correctly signed, so only input validation can stop this
        const result = await run_endpoint(
            createMockRequest({
                headers: headers(auth_token),
                params: { tenant: tenant.name, uid: upload.id },
                body: await makeCompleteBody(
                    keypair,
                    store_hash,
                    store_suffix,
                    file_hash,
                    file_size,
                ),
            }),
            complete_post,
        );
        expect(result._status).toBe(400);
        expect(fs.existsSync("/tmp/iglu-regression/traversal-regression.xz")).toBeFalse();
    });
});

describe("BUGS.md #20: missing signature", () => {
    test("a null cSig (cachix without a signing key) gets an error that mentions the signature", async () => {
        const keypair = await makeEd25519Keypair();
        const tenant = await makeTenant();
        const { api_key, auth_token } = await makeApiKey([tenant], keypair.public_key);
        const { upload, file_hash, file_size } = await makeUploadWithPart(
            tenant,
            api_key,
            randomContent(),
        );
        const body = await makeCompleteBody(
            keypair,
            randomStoreHash(),
            "regression",
            file_hash,
            file_size,
        );
        (body.narInfoCreate as { cSig: string | null }).cSig = null;

        const result = await run_endpoint(
            createMockRequest({
                headers: headers(auth_token),
                params: { tenant: tenant.name, uid: upload.id },
                body,
            }),
            complete_post,
        );
        expect(result._status).toBeGreaterThanOrEqual(400);
        expect(result._status).toBeLessThan(500);
        expect(JSON.stringify(result._jsonBody)).toMatch(/sig/i);
    });
});

describe("BUGS.md #22: partNumber validation", () => {
    test.each([
        ["abc"],
        ["0"],
        ["-1"],
        ["1.5"],
        ["10001"],
    ])("rejects partNumber=%p with 400", async (part_number) => {
        const tenant = await makeTenant();
        const { api_key, auth_token } = await makeApiKey([tenant], "AAAA");
        const { upload } = await makeUploadWithPart(tenant, api_key, randomContent());

        const result = await run_endpoint(
            createMockRequest({
                headers: headers(auth_token),
                params: { tenant: tenant.name, uid: upload.id },
                query: { partNumber: part_number },
                body: { contentMD5: "regression" },
            }),
            uid_post,
        );
        expect(result._status).toBe(400);
    });
});

describe("BUGS.md #23: upload belongs to a different tenant than the URL", () => {
    test("requesting an upload URL through another tenant is rejected", async () => {
        const tenant_a = await makeTenant();
        const tenant_b = await makeTenant();
        const { api_key, auth_token } = await makeApiKey([tenant_a, tenant_b], "AAAA");
        const { upload } = await makeUploadWithPart(tenant_a, api_key, randomContent());

        const result = await run_endpoint(
            createMockRequest({
                headers: headers(auth_token),
                params: { tenant: tenant_b.name, uid: upload.id },
                query: { partNumber: "1" },
                body: { contentMD5: "regression" },
            }),
            uid_post,
        );
        expect(result._status).toBeGreaterThanOrEqual(400);
        expect(result._status).toBeLessThan(500);
    });

    test("completing an upload through another tenant is rejected", async () => {
        const keypair = await makeEd25519Keypair();
        const tenant_a = await makeTenant();
        const tenant_b = await makeTenant();
        const { api_key, auth_token } = await makeApiKey([tenant_a, tenant_b], keypair.public_key);
        const { upload, file_hash, file_size } = await makeUploadWithPart(
            tenant_a,
            api_key,
            randomContent(),
        );
        const store_hash = randomStoreHash();

        const result = await run_endpoint(
            createMockRequest({
                headers: headers(auth_token),
                params: { tenant: tenant_b.name, uid: upload.id },
                body: await makeCompleteBody(
                    keypair,
                    store_hash,
                    "regression",
                    file_hash,
                    file_size,
                ),
            }),
            complete_post,
        );
        expect(result._status).toBeGreaterThanOrEqual(400);
        expect(result._status).toBeLessThan(500);
        const links_b = await new Derivation_tenant_link().getByNixStoreHashesAndTenant(
            [store_hash],
            tenant_b.id,
        );
        expect(links_b.length).toBe(0);
    });
});

describe("BUGS.md #17: raw upload endpoint (filesystem storage)", () => {
    test("PUT /api/v1/iglu/upload/<tenant>/<uid> requires authentication", async () => {
        const tenant = await makeTenant();
        const { api_key } = await makeApiKey([tenant], "AAAA");
        const { upload } = await makeUploadWithPart(tenant, api_key, randomContent());

        const request = createMockRequest({
            headers: headers(), // no authorization header
            params: { tenant: tenant.name, uid: upload.id },
            query: { partNumber: "1" },
        });
        // Minimal stream support so the handler can read a body
        (request as unknown as { pipe: (w: Writable) => void }).pipe = (w: Writable) => {
            w.end(Buffer.from("unauthenticated data"));
        };

        const result = await run_endpoint(request, upload_put);
        // The handler answers asynchronously once the stream finished
        await new Promise((resolve) => setTimeout(resolve, 50));
        expect([401, 403]).toContain(result._status as number);
    });
});
