import { expect, test } from "bun:test";
import * as fs from "node:fs";
import { post } from "@/cache/routes/api/v1/cache/[tenant]/multipart-nar/[uid]/complete";
import { Signing_Keys, Uploads } from "@/shared/db";
import { getFileHash } from "@/shared/files";
import { createMockRequest } from "@/shared/utils/expressUnitTests/createMockRequest";
import { error_response_schema } from "@/shared/utils/zod/rest/base_rest_schemas";
import { run_endpoint } from "@/tests/cache/utils/runEndpoint";
import { setupTenantStructure } from "@/tests/cache/utils/setupTenantStructure";

const { tenant_to_use, auth_token, api_key, signing_key } = await setupTenantStructure();

async function createTestFile(
    upload_id: string,
    split: boolean,
): Promise<{ hash: string; size_in_bytes: number; split_into: number }> {
    // Create a test file and copy it to the tenant directory on the filesystem
    fs.mkdirSync("/tmp/iglu-test", { recursive: true });
    const size = 10 * 1024 * 1024;
    const buffer = Buffer.allocUnsafe(size);
    crypto.getRandomValues(buffer);
    await Bun.write("/tmp/iglu-test/file.bin", buffer);
    const hash = await getFileHash(`/tmp/iglu-test/file.bin`);
    const size_in_bytes = Bun.file(`/tmp/iglu-test/file.bin`).size;

    const part_amount = split ? Math.floor(Math.random() * 5) + 2 : 1;

    if (split === true) {
        const partSize = Math.floor(size / part_amount);
        // Split the created in file in 2 - 6 parts
        for (let i = 0; i < part_amount; i++) {
            const start = i * partSize;
            const end = i === part_amount - 1 ? size : start + partSize;
            const chunk = buffer.subarray(start, end);

            await Bun.write(`/tmp/iglu/${tenant_to_use.id}/${upload_id}.part-${i + 1}`, chunk);
        }
    } else {
        fs.mkdirSync(`/tmp/iglu/${tenant_to_use.id}`, { recursive: true });
        fs.copyFileSync(
            `/tmp/iglu-test/file.bin`,
            `/tmp/iglu/${tenant_to_use.id}/${upload_id}.part-1`,
        );
    }

    return { hash: hash, size_in_bytes: size_in_bytes, split_into: part_amount };
}

test("Expect a POST request that is authenticated and has the correct shape to work", async () => {
    const upload_id = await new Uploads().insert({
        id: "n/a",
        tenants_id: tenant_to_use,
        signed_by: api_key,
        md5: "none",
        compression: "xz",
    });
    expect(upload_id).toBeDefined();

    const { hash, size_in_bytes } = await createTestFile(upload_id.id, false);
    const request = createMockRequest();

    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.body = {
        narInfoCreate: {
            cDeriver: "test",
            cFileHash: hash,
            cFileSize: size_in_bytes,
            cNarHash: Bun.randomUUIDv7(),
            cNarSize: size_in_bytes,
            cReferences: [],
            cSig: Bun.randomUUIDv7(),
            cStoreHash: Bun.randomUUIDv7(),
            cStoreSuffix: "testing",
        },
        parts: [
            {
                eTag: Bun.randomUUIDv7(),
                partNumber: 1,
            },
        ],
    };
    request.params = {
        tenant: tenant_to_use.name,
        uid: upload_id.id,
    };

    const result = await run_endpoint(request, post);
    expect(result).toBeDefined();
    expect(result._status).toBe(200);
    expect(result._jsonBody).toBeUndefined();
});

test("Expect a POST request that is authenticated and has the correct shape as well as an upload with multiple parts to work", async () => {
    const upload_id = await new Uploads().insert({
        id: "n/a",
        tenants_id: tenant_to_use,
        signed_by: api_key,
        md5: "none",
        compression: "xz",
    });
    expect(upload_id).toBeDefined();
    const { hash, size_in_bytes, split_into } = await createTestFile(upload_id.id, true);
    const request = createMockRequest();
    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.body = {
        narInfoCreate: {
            cDeriver: "test",
            cFileHash: hash,
            cFileSize: size_in_bytes,
            cNarHash: Bun.randomUUIDv7(),
            cNarSize: size_in_bytes,
            cReferences: [],
            cSig: Bun.randomUUIDv7(),
            cStoreHash: Bun.randomUUIDv7(),
            cStoreSuffix: "testing",
        },
        parts: (() => {
            const return_array = [];
            for (let i = 0; i < split_into; i++) {
                return_array.push({
                    eTag: Bun.randomUUIDv7(),
                    partNumber: i + 1,
                });
            }
            return return_array;
        })(),
    };
    request.params = {
        tenant: tenant_to_use.name,
        uid: upload_id.id,
    };

    const result = await run_endpoint(request, post);
    expect(result).toBeDefined();
    expect(result._status).toBe(200);
    expect(result._jsonBody).toBeUndefined();
});

test("Expect a POST request that is authenticated but has a malformed body to fail", async () => {
    const upload_id = await new Uploads().insert({
        id: "n/a",
        tenants_id: tenant_to_use,
        signed_by: api_key,
        md5: "none",
        compression: "xz",
    });
    expect(upload_id).toBeDefined();
    const { hash, size_in_bytes, split_into } = await createTestFile(upload_id.id, true);
    const request = createMockRequest();
    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.body = {
        narInfoCreate: {
            cDeriver: "test",
            cFileHash: hash,
            cFileSize: size_in_bytes,
            cNarHash_invalid: Bun.randomUUIDv7(),
            cNarSize: size_in_bytes,
            cReferences: [],
            cSig: Bun.randomUUIDv7(),
            cStoreHash: Bun.randomUUIDv7(),
            cStoreSuffix_invalid: "testing",
        },
        parts: (() => {
            const return_array = [];
            for (let i = 0; i < split_into; i++) {
                return_array.push({
                    eTag: Bun.randomUUIDv7(),
                    partNumber: i + 1,
                });
            }
            return return_array;
        })(),
    };
    request.params = {
        tenant: tenant_to_use.name,
        uid: upload_id.id,
    };

    const result = await run_endpoint(request, post);
    expect(result).toBeDefined();
    expect(result._status).toBe(400);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a POST request that is unauthenticated (by missing auth header) but otherwise correct to fail", async () => {
    const upload_id = await new Uploads().insert({
        id: "n/a",
        tenants_id: tenant_to_use,
        signed_by: api_key,
        md5: "none",
        compression: "xz",
    });
    expect(upload_id).toBeDefined();
    const { hash, size_in_bytes, split_into } = await createTestFile(upload_id.id, true);
    const request = createMockRequest();
    request.headers = {
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.body = {
        narInfoCreate: {
            cDeriver: "test",
            cFileHash: hash,
            cFileSize: size_in_bytes,
            cNarHash: Bun.randomUUIDv7(),
            cNarSize: size_in_bytes,
            cReferences: [],
            cSig: Bun.randomUUIDv7(),
            cStoreHash: Bun.randomUUIDv7(),
            cStoreSuffix: "testing",
        },
        parts: (() => {
            const return_array = [];
            for (let i = 0; i < split_into; i++) {
                return_array.push({
                    eTag: Bun.randomUUIDv7(),
                    partNumber: i + 1,
                });
            }
            return return_array;
        })(),
    };
    request.params = {
        tenant: tenant_to_use.name,
        uid: upload_id.id,
    };

    const result = await run_endpoint(request, post);
    expect(result).toBeDefined();
    expect(result._status).toBe(403);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a POST request that is unauthenticated (by malformed auth header) but otherwise correct to fail", async () => {
    const upload_id = await new Uploads().insert({
        id: "n/a",
        tenants_id: tenant_to_use,
        signed_by: api_key,
        md5: "none",
        compression: "xz",
    });
    expect(upload_id).toBeDefined();
    const { hash, size_in_bytes, split_into } = await createTestFile(upload_id.id, true);
    const request = createMockRequest();
    request.headers = {
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
        authorization: "Bearer_token",
    };
    request.body = {
        narInfoCreate: {
            cDeriver: "test",
            cFileHash: hash,
            cFileSize: size_in_bytes,
            cNarHash: Bun.randomUUIDv7(),
            cNarSize: size_in_bytes,
            cReferences: [],
            cSig: Bun.randomUUIDv7(),
            cStoreHash: Bun.randomUUIDv7(),
            cStoreSuffix: "testing",
        },
        parts: (() => {
            const return_array = [];
            for (let i = 0; i < split_into; i++) {
                return_array.push({
                    eTag: Bun.randomUUIDv7(),
                    partNumber: i + 1,
                });
            }
            return return_array;
        })(),
    };
    request.params = {
        tenant: tenant_to_use.name,
        uid: upload_id.id,
    };

    const result = await run_endpoint(request, post);
    expect(result).toBeDefined();
    expect(result._status).toBe(403);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a POST request that is unauthenticated (by unrecognized token) but otherwise correct to fail", async () => {
    const upload_id = await new Uploads().insert({
        id: "n/a",
        tenants_id: tenant_to_use,
        signed_by: api_key,
        md5: "none",
        compression: "xz",
    });
    expect(upload_id).toBeDefined();
    const { hash, size_in_bytes, split_into } = await createTestFile(upload_id.id, true);
    const request = createMockRequest();
    request.headers = {
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
        authorization: `Bearer ${Bun.randomUUIDv7()}`,
    };
    request.body = {
        narInfoCreate: {
            cDeriver: "test",
            cFileHash: hash,
            cFileSize: size_in_bytes,
            cNarHash: Bun.randomUUIDv7(),
            cNarSize: size_in_bytes,
            cReferences: [],
            cSig: Bun.randomUUIDv7(),
            cStoreHash: Bun.randomUUIDv7(),
            cStoreSuffix: "testing",
        },
        parts: (() => {
            const return_array = [];
            for (let i = 0; i < split_into; i++) {
                return_array.push({
                    eTag: Bun.randomUUIDv7(),
                    partNumber: i + 1,
                });
            }
            return return_array;
        })(),
    };
    request.params = {
        tenant: tenant_to_use.name,
        uid: upload_id.id,
    };

    const result = await run_endpoint(request, post);
    expect(result).toBeDefined();
    expect(result._status).toBe(401);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a POST request that is missing the x-forwarded-for header but otherwise correct to fail", async () => {
    const upload_id = await new Uploads().insert({
        id: "n/a",
        tenants_id: tenant_to_use,
        signed_by: api_key,
        md5: "none",
        compression: "xz",
    });
    expect(upload_id).toBeDefined();
    const { hash, size_in_bytes, split_into } = await createTestFile(upload_id.id, true);
    const request = createMockRequest();
    request.headers = {
        "user-agent": "iglu-sh testing client",
        authorization: `Bearer ${auth_token}`,
    };
    request.body = {
        narInfoCreate: {
            cDeriver: "test",
            cFileHash: hash,
            cFileSize: size_in_bytes,
            cNarHash: Bun.randomUUIDv7(),
            cNarSize: size_in_bytes,
            cReferences: [],
            cSig: Bun.randomUUIDv7(),
            cStoreHash: Bun.randomUUIDv7(),
            cStoreSuffix: "testing",
        },
        parts: (() => {
            const return_array = [];
            for (let i = 0; i < split_into; i++) {
                return_array.push({
                    eTag: Bun.randomUUIDv7(),
                    partNumber: i + 1,
                });
            }
            return return_array;
        })(),
    };
    request.params = {
        tenant: tenant_to_use.name,
        uid: upload_id.id,
    };

    const result = await run_endpoint(request, post);
    expect(result).toBeDefined();
    expect(result._status).toBe(403);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a POST request that has a an invalid file hash but is otherwise correct to fail", async () => {
    const upload_id = await new Uploads().insert({
        id: "n/a",
        tenants_id: tenant_to_use,
        signed_by: api_key,
        md5: "none",
        compression: "xz",
    });
    expect(upload_id).toBeDefined();
    const { size_in_bytes, split_into } = await createTestFile(upload_id.id, true);
    const request = createMockRequest();
    request.headers = {
        "user-agent": "iglu-sh testing client",
        "x-forwarded-for": "10.0.0.1",
        authorization: `Bearer ${auth_token}`,
    };
    request.body = {
        narInfoCreate: {
            cDeriver: "test",
            cFileHash: Bun.randomUUIDv7(),
            cFileSize: size_in_bytes,
            cNarHash: Bun.randomUUIDv7(),
            cNarSize: size_in_bytes,
            cReferences: [],
            cSig: Bun.randomUUIDv7(),
            cStoreHash: Bun.randomUUIDv7(),
            cStoreSuffix: "testing",
        },
        parts: (() => {
            const return_array = [];
            for (let i = 0; i < split_into; i++) {
                return_array.push({
                    eTag: Bun.randomUUIDv7(),
                    partNumber: i + 1,
                });
            }
            return return_array;
        })(),
    };
    request.params = {
        tenant: tenant_to_use.name,
        uid: upload_id.id,
    };

    const result = await run_endpoint(request, post);
    expect(result).toBeDefined();
    expect(result._status).toBe(500);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a POST request that referrs to a non-existing tenant to fail", async () => {
    const upload_id = await new Uploads().insert({
        id: "n/a",
        tenants_id: tenant_to_use,
        signed_by: api_key,
        md5: "none",
        compression: "xz",
    });
    expect(upload_id).toBeDefined();
    const { hash, size_in_bytes, split_into } = await createTestFile(upload_id.id, true);
    const request = createMockRequest();
    request.headers = {
        "user-agent": "iglu-sh testing client",
        "x-forwarded-for": "10.0.0.1",
        authorization: `Bearer ${auth_token}`,
    };
    request.body = {
        narInfoCreate: {
            cDeriver: "test",
            cFileHash: hash,
            cFileSize: size_in_bytes,
            cNarHash: Bun.randomUUIDv7(),
            cNarSize: size_in_bytes,
            cReferences: [],
            cSig: Bun.randomUUIDv7(),
            cStoreHash: Bun.randomUUIDv7(),
            cStoreSuffix: "testing",
        },
        parts: (() => {
            const return_array = [];
            for (let i = 0; i < split_into; i++) {
                return_array.push({
                    eTag: Bun.randomUUIDv7(),
                    partNumber: i + 1,
                });
            }
            return return_array;
        })(),
    };
    request.params = {
        tenant: Bun.randomUUIDv7(),
        uid: upload_id.id,
    };

    const result = await run_endpoint(request, post);
    expect(result).toBeDefined();
    expect(result._status).toBe(404);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a POST request that is missing the tenant param to fail", async () => {
    const upload_id = await new Uploads().insert({
        id: "n/a",
        tenants_id: tenant_to_use,
        signed_by: api_key,
        md5: "none",
        compression: "xz",
    });
    expect(upload_id).toBeDefined();
    const { hash, size_in_bytes, split_into } = await createTestFile(upload_id.id, true);
    const request = createMockRequest();
    request.headers = {
        "user-agent": "iglu-sh testing client",
        "x-forwarded-for": "10.0.0.1",
        authorization: `Bearer ${auth_token}`,
    };
    request.body = {
        narInfoCreate: {
            cDeriver: "test",
            cFileHash: hash,
            cFileSize: size_in_bytes,
            cNarHash: Bun.randomUUIDv7(),
            cNarSize: size_in_bytes,
            cReferences: [],
            cSig: Bun.randomUUIDv7(),
            cStoreHash: Bun.randomUUIDv7(),
            cStoreSuffix: "testing",
        },
        parts: (() => {
            const return_array = [];
            for (let i = 0; i < split_into; i++) {
                return_array.push({
                    eTag: Bun.randomUUIDv7(),
                    partNumber: i + 1,
                });
            }
            return return_array;
        })(),
    };
    request.params = {
        uid: upload_id.id,
    };

    const result = await run_endpoint(request, post);
    expect(result).toBeDefined();
    expect(result._status).toBe(400);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a POST request that referrs to a non-existing upload id to fail", async () => {
    const upload_id = await new Uploads().insert({
        id: "n/a",
        tenants_id: tenant_to_use,
        signed_by: api_key,
        md5: "none",
        compression: "xz",
    });
    expect(upload_id).toBeDefined();
    const { hash, size_in_bytes, split_into } = await createTestFile(upload_id.id, true);
    const request = createMockRequest();
    request.headers = {
        "user-agent": "iglu-sh testing client",
        "x-forwarded-for": "10.0.0.1",
        authorization: `Bearer ${auth_token}`,
    };
    request.body = {
        narInfoCreate: {
            cDeriver: "test",
            cFileHash: hash,
            cFileSize: size_in_bytes,
            cNarHash: Bun.randomUUIDv7(),
            cNarSize: size_in_bytes,
            cReferences: [],
            cSig: Bun.randomUUIDv7(),
            cStoreHash: Bun.randomUUIDv7(),
            cStoreSuffix: "testing",
        },
        parts: (() => {
            const return_array = [];
            for (let i = 0; i < split_into; i++) {
                return_array.push({
                    eTag: Bun.randomUUIDv7(),
                    partNumber: i + 1,
                });
            }
            return return_array;
        })(),
    };
    request.params = {
        tenant: tenant_to_use.name,
        uid: Bun.randomUUIDv7(),
    };

    const result = await run_endpoint(request, post);
    expect(result).toBeDefined();
    expect(result._status).toBe(404);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a POST request that is missing the upload id param to fail", async () => {
    const upload_id = await new Uploads().insert({
        id: "n/a",
        tenants_id: tenant_to_use,
        signed_by: api_key,
        md5: "none",
        compression: "xz",
    });
    expect(upload_id).toBeDefined();
    const { hash, size_in_bytes, split_into } = await createTestFile(upload_id.id, true);
    const request = createMockRequest();
    request.headers = {
        "user-agent": "iglu-sh testing client",
        "x-forwarded-for": "10.0.0.1",
        authorization: `Bearer ${auth_token}`,
    };
    request.body = {
        narInfoCreate: {
            cDeriver: "test",
            cFileHash: hash,
            cFileSize: size_in_bytes,
            cNarHash: Bun.randomUUIDv7(),
            cNarSize: size_in_bytes,
            cReferences: [],
            cSig: Bun.randomUUIDv7(),
            cStoreHash: Bun.randomUUIDv7(),
            cStoreSuffix: "testing",
        },
        parts: (() => {
            const return_array = [];
            for (let i = 0; i < split_into; i++) {
                return_array.push({
                    eTag: Bun.randomUUIDv7(),
                    partNumber: i + 1,
                });
            }
            return return_array;
        })(),
    };
    request.params = {
        tenant: tenant_to_use.name,
    };

    const result = await run_endpoint(request, post);
    expect(result).toBeDefined();
    expect(result._status).toBe(400);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a POST request that that did not upload any files to fail", async () => {
    const upload_id = await new Uploads().insert({
        id: "n/a",
        tenants_id: tenant_to_use,
        signed_by: api_key,
        md5: "none",
        compression: "xz",
    });
    expect(upload_id).toBeDefined();
    //const {hash, size_in_bytes, split_into} = await createTestFile(upload_id.id, true)
    const request = createMockRequest();
    request.headers = {
        "user-agent": "iglu-sh testing client",
        "x-forwarded-for": "10.0.0.1",
        authorization: `Bearer ${auth_token}`,
    };
    request.body = {
        narInfoCreate: {
            cDeriver: "test",
            cFileHash: Bun.randomUUIDv7(),
            cFileSize: 10,
            cNarHash: Bun.randomUUIDv7(),
            cNarSize: 10,
            cReferences: [],
            cSig: Bun.randomUUIDv7(),
            cStoreHash: Bun.randomUUIDv7(),
            cStoreSuffix: "testing",
        },
        parts: [
            {
                eTag: Bun.randomUUIDv7(),
                partNumber: 1,
            },
        ],
    };
    request.params = {
        tenant: tenant_to_use.name,
        uid: upload_id.id,
    };

    const result = await run_endpoint(request, post);
    expect(result).toBeDefined();
    expect(result._status).toBe(500);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});

test("Expect a POST request is trying to complete with an API key that does not have a signing key assigned to it", async () => {
    const upload_id = await new Uploads().insert({
        id: "n/a",
        tenants_id: tenant_to_use,
        signed_by: api_key,
        md5: "none",
        compression: "xz",
    });
    expect(upload_id).toBeDefined();
    const { hash, size_in_bytes, split_into } = await createTestFile(upload_id.id, true);
    await new Signing_Keys().delete(signing_key);
    const request = createMockRequest();
    request.headers = {
        "user-agent": "iglu-sh testing client",
        "x-forwarded-for": "10.0.0.1",
        authorization: `Bearer ${auth_token}`,
    };
    request.body = {
        narInfoCreate: {
            cDeriver: "test",
            cFileHash: hash,
            cFileSize: size_in_bytes,
            cNarHash: hash,
            cNarSize: size_in_bytes,
            cReferences: [],
            cSig: Bun.randomUUIDv7(),
            cStoreHash: Bun.randomUUIDv7(),
            cStoreSuffix: "testing",
        },
        parts: (() => {
            const return_array = [];
            for (let i = 0; i < split_into; i++) {
                return_array.push({
                    eTag: Bun.randomUUIDv7(),
                    partNumber: i + 1,
                });
            }
            return return_array;
        })(),
    };
    request.params = {
        tenant: tenant_to_use.name,
        uid: upload_id.id,
    };

    const result = await run_endpoint(request, post);
    expect(result).toBeDefined();
    expect(result._status).toBe(404);
    expect(result._jsonBody).toBeDefined();
    expect(error_response_schema.safeParse(result._jsonBody).success).toBeTrue();
});
