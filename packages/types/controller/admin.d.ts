import {api_key, builder, cache, public_signing_key, user} from "@types";

export type oobDBObject = {
    cache: cache,
    users: user[],
    api_keys: api_key[],
    signing_keys: public_signing_key,
    builders: builder[],
    hashes_stored: number,
}
