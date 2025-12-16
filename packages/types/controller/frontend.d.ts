import type {
    cache,
    cache_api_key_link,
    cache_signing_key_link, cache_user_link
} from "../core/db.d.ts";

export interface cacheCreationObject{
    cache: cache,
    allowed_users: cache_user_link[],
    allowed_api_keys: cache_api_key_link[],
    allowed_signing_keys: cache_signing_key_link[],
}
