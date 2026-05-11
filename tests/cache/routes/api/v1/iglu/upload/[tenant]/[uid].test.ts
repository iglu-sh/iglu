import { expect, test } from "bun:test";
import { createMockRequest } from "@/shared/utils/expressUnitTests/createMockRequest";
import { run_endpoint } from "@/tests/cache/utils/runEndpoint";
import { put } from "@/cache/routes/api/v1/iglu/upload/[tenant]/[uid]";
import { setupTenantStructure } from "@/tests/cache/utils/setupTenantStructure";
import { Signing_Keys, Uploads } from "@/shared/db";
import { getFileHash } from "@/shared/files";
import { error_response_schema } from "@/shared/utils/zod/zod_rest_schemas";
import {mkdirSync, writeFileSync} from "node:fs"
import { createHash } from "node:crypto";

async function createBufferAndMd5():Promise<{buffer: Buffer<ArrayBuffer>, md5:string}>{
    // Create a test file and copy it to the tenant directory on the filesystem
    mkdirSync(`/tmp/iglu-test/upload`, {recursive: true}) 
    const size = 10 * 1024 * 1024;
    //const buffer = Buffer.allocUnsafe(size);
    const name = Bun.randomUUIDv7()
    //crypto.getRandomValues(buffer);
    const buffer = Buffer.from('This is a test') 
    writeFileSync(`/tmp/iglu-test/upload/${name}.file`, buffer)

    const hasher = new Bun.CryptoHasher('md5')
    const file = Bun.file(`/tmp/iglu-test/upload/${name}.file`)
    for await (const chunk of file.stream()) {
        hasher.update(chunk);
    }
    const hash = createHash('md5').update(buffer).digest('base64') 

    console.log(hash)

    return {buffer: buffer, md5: hash}
}

const {tenant_to_use, auth_token, api_key} = await setupTenantStructure()


test("Expect a POST request that is authenticated and has the correct shape to work", async () =>{

    const {buffer, md5} = await createBufferAndMd5() 
    const upload_id = await new Uploads().insert({
        id: 'n/a',
        tenants_id: tenant_to_use,
        signed_by: api_key, 
        md5: md5,
        compression: 'xz'
    })
    expect(upload_id).toBeDefined()
    const request = createMockRequest();

    request.headers = {
        authorization: `Bearer ${auth_token}`,
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "iglu-sh testing client",
    };
    request.params = {
        tenant: tenant_to_use.name,
        uid: upload_id.id,
    }
    request.query = {
        partNumber: "1"
    }

    request.body = buffer
    console.log('BUFFER IN REQUEST', buffer.toString())
    const result = await run_endpoint(request, put)
    await new Promise<void>((resolve)=>{request.on("end", ()=>resolve())})
})
