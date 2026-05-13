import type { api_key, signing_key, tenant } from "@/db_types";
import { Signing_Keys } from "@/shared/db";
import { Api_keys } from "@/shared/db/DAO/api_key";
import { Api_keys_tenants_link } from "@/shared/db/DAO/api_key_tenant_link";
import { Tenants } from "@/shared/db/DAO/tenants";
import { hashApiKey } from "@/shared/utils/crypto/api_key_generation";
export async function setupTenantStructure(): Promise<{
    tenant_to_use: tenant;
    api_key: api_key;
    signing_key: signing_key;
    auth_token: string;
}> {
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

    const api_key = await new Api_keys().insert({
        id: "n/a",
        hash: hashApiKey(auth_token),
        name: "Test hash key",
    });
    const signing_key = await new Signing_Keys().insert({
        id: "n/a",
        api_keys_id: api_key,
        key: Bun.randomUUIDv7(),
        name: "Key for multipart-nar testing",
    });
    await new Api_keys_tenants_link().insert({
        id: "n/a",
        api_keys_id: api_key,
        tenants_id: tenant_to_use,
    });
    return {
        tenant_to_use: tenant_to_use,
        api_key: api_key,
        signing_key: signing_key,
        auth_token: auth_token,
    };
}
