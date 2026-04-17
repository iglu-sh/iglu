import type { api_key } from "@/db_types";
import Api_keys from "../../db/DAO/api_key";

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
    //const salt = process.env.API_KEY_HASH_SALT ?? 'set this to something secure please god';
    const salt = "set this to something secure please god";
    const hashed = new Bun.CryptoHasher("sha512", salt).update(apiKey).digest("hex");
    return hashed;
}
