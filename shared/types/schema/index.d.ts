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
