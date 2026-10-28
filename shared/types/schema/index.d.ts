import type {
    api_key_definition,
    deployment_keys_definition,
    keypair_definition,
    tenant_definition,
} from "@/shared/utils/cache";

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
    signing_method: "client" | "server";
    managed_by: "configuration" | "server" | "other";
};

export type keypair = {
    id: string;
    private_key: string;
    signing_keys_id: signing_key;
    tenants_id: tenant;
    managed_by: "configuration" | "server" | "other";
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
    managed_by: "configuration" | "server" | "other";
};

export type signing_key = {
    id: string;
    key: string;
    api_keys_id: api_key;
    name: string;
    managed_by: "configuration" | "server" | "other";
};

export type derivation = {
    id: string;
    cderiver: string;
    cfilehash: string;
    cfilesize: number;
    cnarhash: string;
    cnarsize: string;
    creferences: string;
    cstorehash: string;
    cstoresuffix: string;
    parts: string;
    compression: allowed_compression_methods;
};

export type derivation_tenant_link = {
    id: string;
    tenants_id: tenant;
    derivations_id: derivation;
    pin: boolean;
    csig: string;
    signing_keys_id: signing_key;
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
    managed_by: "configuration" | "server" | "other";
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
    timeout: number;
    s3_id: string | null;
};

export type deployment_key = {
    id: string;
    tenants_id: tenant;
    type: "agent" | "activate";
    hash: string;
    expires_at: number;
    created_at: number;
    name: string;
    managed_by: "configuration" | "server" | "other";
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

export interface declarative_versioned_tenant extends tenant_definition, tenant {
    // The key in the configuration this tenant is mapped from
    mapped_from: string;
}

export interface declarative_versioned_api_key
    extends api_key,
        Omit<api_key_definition, "plaintext_key"> {
    // The key in the configuration this tenant is mapped from
    mapped_from: string;
}

export interface declarative_versioned_public_key extends signing_key {
    // The key in the configuration this tenant is mapped from
    mapped_from: string;
}

export interface declarative_versioned_deployment_key
    extends deployment_key,
        Omit<deployment_keys_definition, "plaintext_key"> {
    // The key in the configuration this tenant is mapped from
    mapped_from: string;
}

export interface declarative_versioned_keypair
    extends keypair,
        Omit<keypair_definition, "plaintext_key"> {
    // The key in the configuration this tenant is mapped from
    mapped_from: string;
}

export type database_version = {
    id: number;
    state: {
        tenants: Array<declarative_versioned_tenant>;
        api_keys: Array<declarative_versioned_api_key>;
        public_keys: Array<declarative_versioned_public_key>;
        deployment_keys: Array<declarative_versioned_deployment_key>;
        keypairs: Array<declarative_versioned_keypair>;
    };
    meta: {
        rebuild_date: number;
        name: string;
        previous_generation_id: number;
    };
};
