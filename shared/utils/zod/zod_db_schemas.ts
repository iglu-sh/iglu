import {z} from 'zod'

export const tenant_schema = z.object({
    id: z.string(),
    github_username: z.string(),
    name: z.string(),
    permission: z.string(),
    is_public: z.boolean(),
    preferred_compression_method: z.string(),
    uri: z.string(),
    priority: z.number(),
    ttl: z.number()
})
export const deployment_key_schema = z.object({
    id: z.string(),
    tenants_id: tenant_schema,
    type: z.string(),
    hash: z.string(),
    expires_at: z.number(),
    created_at: z.number(),
    name: z.string()
})
export const agent_schema = z.object({
    id: z.string(),
    last_seen: z.number(),
    version: z.string(),
    os: z.string(),
    is_online: z.boolean(),
    name: z.string(),
    tenants_id: tenant_schema,
    last_key_used: deployment_key_schema
})

export const access_rule_schema = z.object({
    id: z.string(),
    tenants_id: tenant_schema,
    ip_block: z.string(),
    start_ip: z.number(),
    end_ip: z.number(),
    priority: z.number(),
    action: z.enum(['drop', 'accept']),
    name: z.string()
})
