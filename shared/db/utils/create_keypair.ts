import { generateKeyPairSync } from "node:crypto";
import { Logger } from "@iglu-sh/shared/logger";
import type { api_key, keypair } from "@iglu-sh/shared/types";
import { encrypt_key } from "@iglu-sh/shared/utils/crypto/encrypt_decrypt_keypair";
import { Api_keys } from "../DAO/api_key";
import { Api_keys_tenants_link } from "../DAO/api_key_tenant_link";
import { Keypairs } from "../DAO/keypairs";
import { Signing_Keys } from "../DAO/signing_keys";
import { Tenants } from "../DAO/tenants";

/**
 * @description Generates a new server-side-signing keypair for a given tenant. If that tenant already has one associated with it, an error will be thrown
 * @param {string} tenant_id The ID of the tenant to create it in
 * @returns {Promise<keypair>}
 * @throws {Error}
 * */
export async function create_keypair(tenant_id: string): Promise<keypair> {
    const keypair_for_cache = await new Keypairs().getByTenant(tenant_id);

    // Return early if the requested cache already has a keypair associated with it
    if (keypair_for_cache) return keypair_for_cache;

    const all_api_keys_for_cache = await new Api_keys_tenants_link().getByTenant(tenant_id);
    const filtered_keys = all_api_keys_for_cache.filter(
        (x) => x.api_keys_id.name === "IGLU_SERVERSIDE_SIGNING_KEY",
    );

    if (filtered_keys.length > 1) {
        Logger.error(
            "Unable to reliably determine which API Key to use for a new serverside signing keypair. Manually remove any key that has the phrase IGLU_SERVERSIDE_SIGNING_KEY in the 'hash' field and try again",
        );
        throw new Error(
            "Unable to reliably determine which API Key to use for a new serverside signing keypair. Manually remove any key that has the phrase IGLU_SERVERSIDE_SIGNING_KEY in the 'hash' field and try again",
        );
    }

    // If there's no dummy api key for the cache yet, then we create a new dummy key
    let api_key_to_use: api_key | undefined = filtered_keys[0]?.api_keys_id;
    const db_tenant = await new Tenants().getById(tenant_id);
    if (!db_tenant) {
        throw new Error("Unable to get tenant to add keypair to");
    }

    if (all_api_keys_for_cache.length === 0 || filtered_keys.length === 0 || !api_key_to_use) {
        api_key_to_use = await new Api_keys().insert({
            id: "n/a",
            hash: `IGLU_SERVERSIDE_SIGNING_KEY-${Bun.randomUUIDv7()}`,
            name: "IGLU_SERVERSIDE_SIGNING_KEY",
        });
        await new Api_keys_tenants_link().insert({
            id: "n/a",
            api_keys_id: api_key_to_use,
            tenants_id: db_tenant,
        });
    }

    // Create a ed25519 keypair
    const { privateKey } = generateKeyPairSync("ed25519");
    const jwk = privateKey.export({ format: "jwk" });

    // JWK allows us to only have a "private" key and then perform this buffer magic that I don't really know what it does
    const seed = Buffer.from(jwk.d as string, "base64url"); // 32 bytes
    const pub = Buffer.from(jwk.x as string, "base64url"); // 32 bytes

    const database_publickey = await new Signing_Keys().insert({
        id: "n/a",
        name: "IGLU_SERVERSIDE_SIGNING_KEY",
        api_keys_id: api_key_to_use,
        key: pub.toString("base64"),
    });

    return await new Keypairs().insert({
        id: "n/a",
        tenants_id: db_tenant,
        private_key: encrypt_key(Buffer.concat([seed, pub]).toString("base64")),
        signing_keys_id: database_publickey,
    });
}
