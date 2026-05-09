import * as sqliteI from "./schema_sqlite";
import * as pgI from "./schema_pg";

export * from "./DAO/access_rules";
export * from "./DAO/agents";
export * from "./DAO/agents_deployments_links";
export * from "./DAO/api_key";
export * from "./DAO/api_key_tenant_link";
export * from "./DAO/deployment";
export * from "./DAO/deployment_keys";
export * from "./DAO/derivation";
export * from "./DAO/derivation_tenant_link";
export * from "./DAO/request";
export * from "./DAO/signing_keys";
export * from "./DAO/tenants";
export * from "./DAO/uploads";
export namespace schema {
    export import sqlite = sqliteI;
    export import pg = pgI;
}
