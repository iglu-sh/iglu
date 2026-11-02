import type { api_key } from "@iglu-sh/shared";
import { Configuration } from "@iglu-sh/shared/utils/cache";
import { Api_keys } from "../../db/DAO/api_key";

/**
 * @description Generates and inserts a new API Key into the database
 * @param {name} name - Optional - Give the Key a name
 * */
export async function create_api_key(name?: string): Promise<{
    raw: string;
    api_key_object: api_key;
}> {
    const raw_api_key = Bun.randomUUIDv7();

    // Hash the key
    const hashed_key = hashApiKey(raw_api_key);
    const api_key_object = await new Api_keys().insert({
        id: "n/a",
        name: name ?? "No name provided",
        hash: hashed_key.trim(),
    });

    return {
        api_key_object: api_key_object,
        raw: raw_api_key,
    };
}

export function hashApiKey(apiKey: string): string {
    const salt = Configuration.getConfig().server.hashing_secret;
    if (!salt) {
        throw new Error("BUG: Hashing Secret not found.");
    }
    const hashed = new Bun.CryptoHasher("sha512", salt).update(apiKey).digest("hex");
    return hashed;
}
