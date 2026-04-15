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
    name: string;
};

export type derivation = {
    id: string;
    signing_keys_id: signing_key;
    cderiver: string;
    cfilehash: string;
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

export type requests = {
    id: string;
    derivations_tenants_links: derivation_tenant_link;
    direction: "inbound" | "outbound";
    date: string;
    url: string;
};

export type api_key = {
    id: string;
    signing_key_id: signing_key;
    hash: string;
    name: string;
};

export type api_key_tenant_link = {
    id: string;
    tenants_id: tenant;
    api_keys_id: api_key;
};
