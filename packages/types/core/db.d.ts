import {wsMsg} from "@types/builder";
import * as buffer from "buffer";

export type valid_build_states = "created" | "claimed" | "starting" | "running" | "failed" | "success" | "canceled"
export type arches = "x86_64-linux" | "aarch64-linux" | 'armv7l' | 'i686' | 'riscv64' | 'aarch64-darwin' | 'x86_64-darwin'
export type compression_method = 'xz' | 'zstd'
export type substituter = {
    url: string;
    signingkeys: string[]
}
export type api_key =  {
    id: string;
    user: user;
    name: string,
    hash: string,
    description: string,
    created_at: Date;
    last_used: Date;
}
export type api_key_raw =  {
    id: string;
    user: string;
    name: string,
    hash: string,
    description: string,
    created_at: Date;
    last_used: Date;
}
export type build_config = {
    id:string;
    builder: builder;
    cores: number;
    maxjobs: number;
    keep_going: number;
    extraargs: string;
    substituters: substituter[];
    parallelbuilds: boolean;
    command: string;
}
export type build_config_raw = {
    id:string;
    builder: string;
    cores: number;
    maxjobs: number;
    keep_going: number;
    extraargs: string;
    substituters: substituter[];
    parallelbuilds: boolean;
    command: string;
}
export type build_log = {
    id: string;
    builder: builder;
    node: node;
    status: valid_build_states;
    started_at: Date;
    ended_at: Date;
    updated_at: Date;
    gitcommit: string,
    duration: string;
    log: Array<wsMsg>
}
export type build_log_raw = {
    id: string;
    builder: string;
    node: string;
    status: valid_build_states;
    started_at: Date;
    ended_at: Date;
    updated_at: Date;
    gitcommit: string,
    duration: string;
    log: Array<wsMsg>
}
export type builder = {
    id: string;
    cache: cache;
    name: string;
    description: string;
    enabled: boolean;
    trigger: string;
    cron: string;
    created_at: Date;
    updated_at: Date;
    arch: arches;
    webhookurl: string;
}
export type builder_raw = {
    id: string;
    cache: string;
    name: string;
    description: string;
    enabled: boolean;
    trigger: string;
    cron: string;
    created_at: Date;
    updated_at: Date;
    arch: arches;
    webhookurl: string;
}
export type cache = {
    id:string;
    githubusername: string;
    ispublic: boolean;
    name: string;
    permission: string;
    preferredcompressionmethod: compression_method;
    uri: string;
    priority: number;
}
export type cache_api_key_link = {
    id: string;
    cache: cache;
    api_key: api_key;
}
export type cache_api_key_link_raw = {
    id: string;
    cache: string;
    api_key: string;
}
export type cache_builder_key = {
    id: string;
    cache: cache;
    signingkey: public_signing_key;
    apikey: api_key;
    plaintext_apikey: string;
    plaintext_signingkey: string;
}
export type cache_builder_key_raw = {
    id: string;
    cache: string;
    signingkey: string;
    apikey: string;
    plaintext_apikey: string;
    plaintext_signingkey: string;
}
export type cache_config = {
    id: string;
    key: string;
    value: string;
}
export type cache_signing_key_link = {
    id: string;
    cache: cache;
    public_signing_key: public_signing_key;
}
export type cache_signing_key_link_raw = {
    id: string;
    cache: string;
    public_signing_key: string;
}
export type cache_user_link = {
    id: string;
    cache: cache;
    user: user;
}
export type cache_user_link_raw = {
    id: string;
    cache: string;
    user: string;
}
export type cachix_config = {
    id: string;
    builder: builder;
    target: cache;
    cache_builder_key: cache_builder_key;
    push: boolean;
    buildoutputdir: string;
}
export type cachix_config_raw = {
    id: string;
    builder: string;
    target: string;
    cache_builder_key: string[];
    push: boolean;
    buildoutputdir: string;
}
export type controller_config = {
    id: string;
    key: string;
    value: string;
}
export type git_config = {
    id: string;
    builder: builder;
    repository: string;
    branch: string;
    gitusername: string;
    gitkey: string;
    requiresauth: boolean;
    noclone: boolean;
}
export type git_config_raw = {
    id: string;
    builder: string;
    repository: string;
    branch: string;
    gitusername: string;
    gitkey: string;
    requiresauth: boolean;
    noclone: boolean;
}
export type hash = {
    id: string;
    creator_api_key: api_key;
    path: string;
    updated_at: string;
    cderiver: string;
    cfilehash: string;
    cfilesize: number;
    cnarhash: string;
    cnarsize: number;
    creferences: string[];
    csig: string;
    cstorehash: string;
    cstoresuffix: string;
    parts: unknown[];
    compression: compression_method;
}

export type hash_raw = {
    id: string;
    creator_api_key: string;
    path: string;
    updated_at: string;
    cderiver: string;
    cfilehash: string;
    cfilesize: number;
    cnarhash: string;
    cnarsize: number;
    creferences: string[];
    csig: string;
    cstorehash: string;
    cstoresuffix: string;
    parts: unknown[];
    compression: string;
}
export type hash_cache_link = {
    id: string;
    hash: hash;
    cache: cache;
}
export type hash_cache_link_raw = {
    id: string;
    hash: string;
    cache: string;
}
export type hash_request = {
    id: string;
    hash: hash;
    type: string;
    time: Date;
}
export type hash_request_raw = {
    id: string;
    hash: string;
    type: string;
    time: Date;
}
export type node = {
    id: string;
    config: node_config;
    name: string;
    address: string;
    port: string;
    version: string;
    arch: string;
    os: string;
    max_jobs: string;
    auth_token: string;
}
export type node_raw = {
    id: string;
    config: string;
    name: string;
    address: string;
    port: string;
    version: string;
    arch: string;
    os: string;
    max_jobs: string;
    auth_token: string;
}
export type node_config = {
    id: string;
    key: string;
    // TODO: This should reflect a real node config value type
    value: unknown
}
export type public_signing_key = {
    id: string;
    api_key: api_key;
    name: string;
    public_signing_key: string;
    description: string;
    created_at: Date;
}
export type public_signing_key_raw = {
    id: string;
    api_key: string;
    name: string;
    public_signing_key: string;
    description: string;
    created_at: Date;
}
export type user = {
    id: string;
    username: string;
    email: string;
    password: string;
    createdat: Date;
    updatedat: Date;
    last_login: Date;
    is_admin: boolean;
    is_verified: boolean;
    must_change_password: boolean;
    show_oob: boolean;
    avatar: Buffer;
    avatar_color: string;
}
export type user_log = {
    id: string;
    user: user;
    time: Date;
    type: string;
    data: unknown
}
export type user_log_raw = {
    id: string;
    user: string;
    time: Date;
    type: string;
    data: unknown
}
