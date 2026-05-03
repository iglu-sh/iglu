export type allowed_compression_methods = "xz" | "zstd";

export type tenant = {
    id: string;
    github_username: string;
    is_public: boolean;
    name: string;
    permission: string;
    preferred_compression_method: string;
    uri: string;
    priority: number;
    ttl: number;
};

export type access_rule = {
    id: string;
    tenants_id: tenant;
    ip_block: string;
    start_ip: number;
    priority: number;
    end_ip: number;
    action: "drop" | "accept";
    name: string;
};

export type signing_key = {
    id: string;
    key: string;
    api_keys_id: api_key;
    name: string;
};

export type derivation = {
    id: string;
    signing_keys_id: signing_key;
    cderiver: string;
    cfilehash: string;
    cfilesize: number;
    cnarhash: string;
    cnarsize: string;
    creferences: string;
    csig: string;
    cstorehash: string;
    cstoresuffix: string;
    parts: string;
    compression: allowed_compression_methods;
};

export type derivation_tenant_link = {
    id: string;
    tenants_id: tenant;
    derivations_id: derivation;
};

export type request = {
    id: string;
    derivations_tenants_links: string; // This is not a derivation_tenant_link table entry because the joining required would be awfull to implement and most of the time you just want a record associated with that ID anyway (which is a string)
    direction: "inbound" | "outbound";
    date: number;
    url: string;
};

export type api_key = {
    id: string;
    hash: string;
    name: string;
};

export type api_key_tenant_link = {
    id: string;
    tenants_id: tenant;
    api_keys_id: api_key;
};

export type upload = {
    id: string;
    tenants_id: tenant;
    signed_by: api_key;
    md5: string;
    compression: allowed_compression_methods;
};

export type deployment_key = {
    id: string;
    tenants_id: tenant;
    type: "agent" | "activate";
    hash: string;
    expires_at: number;
    created_at: number;
    name: string;
};

export type deployment = {
    id: string;
    tenants_id: tenant;
    created_at: number;
    start_time: number;
    end_time: number;
    status: "Pending" | "InProgress" | "Cancelled" | "Failed" | "Succeeded";
    deploy_json: string;
    deployment_index: number;
    key_used: deployment_key;
};

export type agent = {
    id: string;
    tenants_id: tenant;
    last_seen: number;
    version: string;
    os: string;
    is_online: boolean;
    name: string;
    last_key_used: deployment_key;
};

export type agents_deployments_link = {
    id: string;
    deployments_id: deployment;
    agents_id: agent;
    log: string | null;
    started_at: number;
    finished_at: number | null;
    store_path: string;
    closure_size: number | null;
    status: "Pending" | "InProgress" | "Cancelled" | "Failed" | "Succeeded";
};
