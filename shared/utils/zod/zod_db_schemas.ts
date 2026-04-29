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
    type: z.string(),
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
    closure_size: z.number().nullable(),
    status: z.enum(["Pending", "InProgress", "Cancelled", "Failed", "Succeeded"]),
    deploy_json: z.string(),
    deployment_index: z.number(),
    store_path: z.string(),
    key_used: deployment_key_schema,
});

export const agents_deployments_link_schema = z.object({
    id: z.string(),
    deployments_id: deployment_schema, //TODO: Replace
    agents_id: agent_schema,
    log: z.string().nullable(),
    started_at: z.number(),
    finished_at: z.number().nullable(),
});

export const api_keys_schema = z.object({
    id: z.string(),
    hash: z.string(),
    name: z.string(),
});

export const api_keys_tenants_links_schema = z.object({
    id: z.string(),
    api_keys_id: api_keys_schema,
    tenants_id: tenant_schema,
});
