import type {
    user,
    cache,
    node_config,
    cache_config,
    controller_config,
    user_log,
    api_key,
    cache_api_key_link,
    public_signing_key,
    cache_signing_key_link,
    hash,
    hash_request,
    builder,
    cache_builder_key,
    build_config,
    git_config, cachix_config, node, build_log
} from "@iglu-sh/types/core/db";
import { Setup as libSetup } from "./db/setup.ts";
import {db} from "./db";
import Database = db.Database;
process.env.POSTGRES_USER = "iglu";
process.env.POSTGRES_HOST = "127.0.0.1";
process.env.POSTGRES_DB = "cache";
process.env.POSTGRES_PASSWORD = "iglu";
process.env.POSTGRES_PORT = "5432";
const database = new Database();
await database.connect(false);
await database.query(`DROP SCHEMA IF EXISTS cache CASCADE;`);
const setup = new libSetup()
await setup.createDatabase()
//await database.connect(false);


const user = await database.query(`
    INSERT INTO cache.user (username, email, password, last_login) VALUES ('test_inuit', 'inuit@example.com', 'hashed_password', NOW())
        RETURNING *;
`).then((res)=>{
    return res.rows[0] as user
})
const cache:cache = await database.query(`
    INSERT INTO cache.cache (name, permission, uri) VALUES('default', 'public', 'https://iglu.sh/cache/default')
    RETURNING *;
`).then((res)=>{
    return res.rows[0] as cache
})
const node_config = await database.query(`
    INSERT INTO cache.node_config (data) VALUES ('{}')
    RETURNING *;
`).then((res)=>{
    return res.rows[0] as node_config
})
const cache_config = await database.query(`
    INSERT INTO cache.cache_config (key, value) VALUES ('postgres', 'postgres'), ('name', 'default_cache')
    RETURNING *;
`).then((res)=>{
    return res.rows[0] as cache_config
})
const controller_config = await database.query(`
    INSERT INTO cache.cache_config (key, value) VALUES ('controller_url', 'https://iglu.sh/controller')
    RETURNING *;
`).then((res)=>{
    return res.rows[0] as controller_config
})
const user_log = await database.query(`
    INSERT INTO cache.user_log ("user", type, data) VALUES ($1, 'create', '{"info":"User created"}')
    RETURNING *;
`, [user.id]).then((res)=>{
    let entry:user_log = {
        ...res.rows[0],
        user: user
    }
    return entry
})
const cache_user_link = await database.query(`
    INSERT INTO cache.cache_user_link (cache, "user") VALUES ($1, $2)
        RETURNING *
`, [cache.id, user.id]).then((res)=>{
    return {
        id: res.rows[0].id,
        cache: cache,
        user: user
    }
})
const api_key = await database.query(`
    INSERT INTO cache.api_key ("user", name, hash, description, last_used) VALUES ($1, 'Test Key', 'hashed', 'description', now())
        RETURNING *;
`, [user.id]).then((res)=>{
    return {
        ...res.rows[0],
        user: user
    } as api_key
})
const cache_api_key_link:cache_api_key_link = await database.query(`
    INSERT INTO cache.cache_api_key_link (cache, api_key) VALUES ($1, $2)
        RETURNING *;
`, [cache.id, api_key.id]).then((res)=>{
    return {
        cache: cache,
        api_key: api_key,
        id: res.rows[0].id
    }
})
const public_signing_key = await database.query(`
   INSERT INTO cache.public_signing_key (api_key, name, public_signing_key, description) VALUES ($1, 'Test Key', 'public_key_string', 'A test public signingkey')
    RETURNING *;
`, [api_key.id]).then((res)=>{
    return {
        ...res.rows[0],
        api_key: api_key
    } as public_signing_key
})
const cache_signing_key_link = await database.query(`
    INSERT INTO cache.cache_signing_key_link (cache, public_signing_key) VALUES ($1, $2)
    RETURNING *;
`, [cache.id, public_signing_key.id]).then((res)=>{
    return {
        id: res.rows[0].id,
        cache: cache,
        public_signing_key: public_signing_key
    } as cache_signing_key_link
})
const hash = await database.query(`
    INSERT INTO cache.hash (creator_api_key, path, cderiver, cfilehash, cfilesize, cnarhash, cnarsize, creferences, csig, cstorehash, cstoresuffix, parts, compression, signed_by)  
        VALUES ($1, '/path/to/resource', 'deriver_info', 'filehash123', 2048, 'narhash123', 4096, '{}', 'signature_string', 'storehash123', 'suffix_info', '{}', 'xz', $2)
        RETURNING *;
`, [api_key.id, cache_signing_key_link.id]).then((res)=>{
    return {
        ...res.rows[0],
        creator_api_key: api_key,
        signed_by: public_signing_key,
    } as hash
})
const hash_request = await database.query(`
    INSERT INTO cache.hash_request (hash, type, time) VALUES ($1, 'fetch', NOW())
        RETURNING *;
`, [hash.id]).then((res)=>{
    return {
        id: res.rows[0].id,
        hash: hash,
        type: res.rows[0].type,
        time: res.rows[0].time
    } as hash_request
})
const hash_cache_link = await database.query(`
    INSERT INTO cache.hash_cache_link (hash, cache) VALUES ($1, $2)
        RETURNING *;
`, [hash.id, cache.id]).then((res)=>{
    return {
        id: res.rows[0].id,
        hash: hash,
        cache: cache
    }
})
const builder = await database.query(`
    INSERT INTO cache.builder (cache, name, description, trigger, cron, arch) VALUES ($1, 'default_builder', 'A default builder', 'on_push', '0 0 * * *', 'x86_64-linux')
        RETURNING *;
`, [cache.id]).then((res)=>{
    return {
        ...res.rows[0],
        cache: cache
    } as builder
})
const cache_builder_key = await database.query(`
    INSERT INTO cache.cache_builder_key (cache, signingkey, apikey, plaintext_apikey, plaintext_signingkey) VALUES 
        ($1, $2, $3, 'plain_api_key_string', 'plain_signing_key_string')
        RETURNING *;
`, [cache.id, public_signing_key.id, api_key.id]).then((res)=>{
    return {
        ...res.rows[0],
        cache: cache,
        signingkey: builder,
        apikey: api_key
    } as cache_builder_key
})
const build_config = await database.query(`
    INSERT INTO cache.build_config (builder, cores, maxjobs, keep_going, extraaargs, substituters, parallelbuilds, command) 
        VALUES ($1, 4, 2, true, '--option', Array ['{}'::jsonb], false, 'build_command')
        RETURNING *;
`, [builder.id]).then((res)=>{
    return {
        ...res.rows[0],
        builder: builder
    } as build_config
})
const git_config = await database.query(`
    INSERT INTO cache.git_config (builder, repository, branch, gitusername, gitkey) VALUES ($1, 'yeah', 'main', '', '')
        RETURNING *;
`, [builder.id]).then((res)=>{
    return {
        ...res.rows[0],
        builder: builder
    } as git_config
})
const cachix_config = await database.query(`
    INSERT INTO cache.cachix_config (builder, target, cache_builder_key) VALUES ($1, $2, $3)
        RETURNING *;
`, [builder.id, cache.id, cache_builder_key.id]).then((res)=>{
    return {
        id: res.rows[0].id,
        builder: builder,
        target: cache,
        cache_builder_key: cache_builder_key,
        ...res.rows[0]
    } as cachix_config
})
const node = await database.query(`
    INSERT INTO cache.node (config, name, address, port, version, arch, os, auth_token) VALUES ($1, 'node1', '', 8080, 'v0.0.1', 'x86_64-linux', 'linux', 'auth_token_123')
        RETURNING *;
`, [node_config.id]).then((res)=>{
    return {
        ...res.rows[0],
        config: node_config
    } as node
})
const build_log = await database.query(`
    INSERT INTO cache.build_log (builder, node, status, started_at, ended_at, updated_at, gitcommit, duration, log) VALUES
        ($1, $2, 'success', NOW(), NOW(), NOW(), 'commit123', '5m', '{}')
`, [builder.id, node.id]).then((res)=>{
    return {
        ...res.rows[0],
        builder: builder,
        node: node
    } as build_log
})
await database.disconnect().then(()=>{
    process.exit(0)
})