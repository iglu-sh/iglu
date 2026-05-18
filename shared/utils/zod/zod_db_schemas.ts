import z from "zod";

export const tenant_schema = z.object({
    id: z.string(),
    github_username: z.string(),
    name: z.string(),
    permission: z.string(),
    is_public: z.boolean(),
    preferred_compression_method: z.string(),
    uri: z.string(),
    priority: z.number(),
    ttl: z.number(),
});
export const deployment_key_schema = z.object({
    id: z.string(),
    tenants_id: tenant_schema,
    type: z.enum(["agent", "activate"]),
    hash: z.string(),
    expires_at: z.number(),
    created_at: z.number(),
    name: z.string(),
});
export const agent_schema = z.object({
    id: z.string(),
    last_seen: z.number(),
    version: z.string(),
    os: z.string(),
    is_online: z.boolean(),
    name: z.string(),
    tenants_id: tenant_schema,
    last_key_used: deployment_key_schema,
});

export const access_rule_schema = z.object({
    id: z.string(),
    tenants_id: tenant_schema,
    ip_block: z.string(),
    start_ip: z.number(),
    end_ip: z.number(),
    priority: z.number(),
    action: z.enum(["drop", "accept"]),
    name: z.string(),
});

export const deployment_schema = z.object({
    id: z.string(),
    tenants_id: tenant_schema,
    created_at: z.number(),
    start_time: z.number(),
    end_time: z.number(),
    status: z.enum(["Pending", "InProgress", "Cancelled", "Failed", "Succeeded"]),
    deploy_json: z.string(),
    deployment_index: z.number(),
    key_used: deployment_key_schema,
});

export const agents_deployments_link_schema = z.object({
    id: z.string(),
    deployments_id: deployment_schema,
    agents_id: agent_schema,
    log: z.string().nullable(),
    started_at: z.number(),
    finished_at: z.number().nullable(),
    store_path: z.string(),
    closure_size: z.number().nullable(),
    status: z.enum(["Pending", "InProgress", "Cancelled", "Failed", "Succeeded"]),
});

export const api_keys_schema = z.object({
    id: z.string(),
    hash: z.string(),
    name: z.string(),
});

export const signing_keys_schema = z.object({
    id: z.string(),
    key: z.string(),
    api_keys_id: api_keys_schema,
    name: z.string(),
});

export const api_keys_tenants_links_schema = z.object({
    id: z.string(),
    api_keys_id: api_keys_schema,
    tenants_id: tenant_schema,
});

export const derivations_schema = z.object({
    id: z.string(),
    cderiver: z.string(),
    cfilehash: z.string(),
    cfilesize: z.number(),
    cnarhash: z.string(),
    cnarsize: z.string(),
    creferences: z.string(),
    csig: z.string(),
    cstorehash: z.string(),
    cstoresuffix: z.string(),
    parts: z.string(),
    signing_keys_id: signing_keys_schema,
    compression: z.enum(["xz", "zstd"]),
});

export const derivations_tenants_links_schema = z.object({
    id: z.string(),
    derivations_id: derivations_schema,
    tenants_id: tenant_schema,
    pin: z.boolean()
});

export const requests_schema = z.object({
    id: z.string(),
    derivations_tenants_links: z.string(),
    direction: z.enum(["inbound", "outbound"]),
    date: z.number(),
    url: z.string(),
});

export const uploads_schema = z.object({
    id: z.string(),
    tenants_id: tenant_schema,
    signed_by: api_keys_schema,
    md5: z.string(),
    compression: z.enum(["xz", "zstd"]),
});
