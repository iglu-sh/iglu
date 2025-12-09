import {arch} from "@types/controller";

export type uuid = `${string}-${string}-${string}-${string}-${string}`;
export type valid_build_states = "created" | "claimed" | "starting" | "running" | "failed" | "success" | "canceled"
export type User = {
    id: uuid;
    username: string;
    password: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
    last_login: Date | null;
    is_admin: boolean;
    is_verified: boolean;
    must_change_password: boolean;
    avatar_color: string;
    show_oob: boolean;
}
export type builder = {
    id: number,
    cache_id: number,
    name: string,
    description: string,
    enabled: boolean,
    trigger: string,
    cron: string,
    webhookurl: string,
    arch: arch,
}
export type builder_runs = {
    id: number,
    builder_id: number,
    status: valid_build_states,
    started_at: Date | null,
    updated_at: Date,
    ended_at: Date | null,
    gitcommit: string,
    duration: string,
    log: string,
    node_id: string
}
export interface builder_runs_with_node extends builder_runs {
    node_info: node
}
export type cache_key = {
    id: number,
    cache_id: number,
    key_id: number,
    permissions: string,
    created_at: Date
}

export type cache = {
    id: number,
    githubusername: string,
    ispublic: boolean,
    name: string,
    permission: string,
    preferredcompressionmethod: string,
    uri: string,
    priority: number,
}
export type cachixconfigs = {
    id: number,
    builder_id: number,
    push: boolean,
    target: number,
    apikey: string,
    apikeyid: number,
    signingkey: string,
    signingkeyid: number,
    buildoutpudir: string
}
export type git_configs = {
    id: number,
    builder_id: number,
    repository: string,
    branch: string,
    gitusername: string,
    gitkey: string,
    requiresauth: boolean,
    noclone: boolean
}
export type hashes = {
    id: number,
    path: string,
    cache: number,
    updatedat: Date | null,
    cderiver: string,
    cfilehash: string,
    cfilesize: number,
    cnarhash: string,
    cnarsize: number,
    creferences: Array<string>,
    csig: string,
    cstorehash: string,
    cstoresuffix: string,
    parts: object[],
    compression: string
}
export type keys = {
    id: number,
    name: string,
    hash: string,
    description: string,
    created_at: Date,
    updated_at: Date,
    user_id: uuid
}
export type public_signing_keys = {
    id: number,
    name: string,
    key: string,
    description: string,
    created_at: Date
}
export type request = {
    id: number,
    fs_storage_path: string,
    log_level: string,
    max_storage_size: bigint,
    cache_root_domain: string
}
export type signing_key_cache_api_link = {
    id: number,
    cache_id: number,
    key_id: number,
    signing_key_id: number
}
export type builder_user_link = {
    id: number,
    builer_id: number,
    user_id: uuid,
}
export type cache_user_link = {
    id: number,
    cache_id: number,
    user_id: uuid,
}
export type substituter = {
    url: string,
    public_signing_keys: Array<string>
}
export type buildoptions = {
    id: number,
    builder_id: number,
    cores: number,
    maxjobs: number,
    keep_going: boolean,
    extraargs: string,
    substituters: Array<substituter>,
    command: string
}
export type aggregatedBuilder = {
    builder: builder,
    runs: builder_runs[],
    git_config: git_configs,
    cachix_config: cachixconfigs,
    build_options: buildoptions
}
export interface combinedSetupBuilder extends combinedBuilder{
    cache_uri: string
}
export type xTheEverythingType = {
    cache: cache,
    builders: aggregatedBuilder[] | null,
    public_signing_keys: {
        key: public_signing_keys,
        link_record: signing_key_cache_api_link
    }[] | null,
    api_keys: keys[] | null,
    derivations: {
        count: number,
        size: number | null
    },
}

export type apiKeyWithCache = {
    key: keys,
    cacheKeyLinks: cache_key[],
    caches: cache[]
}
export type dbLogResourceType = 'cache' | 'derivation' | 'user' | 'builder' | 'signing_key' | 'api_key'
export type dbLogType = 'create' | 'update' | 'delete' | 'read'
export type dbLogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'
export type log = {
    id: uuid,
    timestamp: Date,
    cache_id: number,
    type: dbLogType,
    resource_type: dbLogResourceType,
    resource_id: string,
    level: dbLogLevel,
    body: {
        'type': dbLogResourceType,
        'action': dbLogType,
        'new': object | null,
        'old': object | null
    },
    resource_name: string,
    updated_by: User,
}
export type node = {
    id: string,
    node_name: string,
    node_address: string,
    node_port: string,
    node_version: string,
    node_arch: string,
    node_max_jobs: string
}

export type combinedBuilder = Omit<aggregatedBuilder, 'runs'>
export interface dbQueueEntry extends combinedBuilder {
    builder_run: {
        run: builder_runs,
        node_info: node
    }
}

export type pkgsInfo = {
  cstoresuffix: string,
  size: number,
  timestamp: Date
}

