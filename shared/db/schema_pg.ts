import { sql } from "drizzle-orm";
import {
    bigint,
    boolean,
    integer,
    pgEnum,
    pgTable,
    primaryKey,
    text,
    uuid,
} from "drizzle-orm/pg-core";

export const tenants = pgTable("tenants", {
    id: uuid("id")
        .primaryKey()
        .default(sql`uuidv7()` as unknown as string),
    github_username: text().notNull(),
    is_public: boolean().notNull(),
    name: text().notNull().unique(),
    uri: text().notNull(),
    priority: integer().notNull(),
    permission: text().notNull(),
    preferred_compression_method: text().notNull(),
    ttl: bigint("ttl", { mode: "number" })
        .default(3600 * 24)
        .notNull(),
});

export const accessRuleAction = pgEnum("access_rule_action", ["drop", "accept"]);
export const access_rules = pgTable("access_rules", {
    id: uuid("id")
        .primaryKey()
        .default(sql`uuidv7()` as unknown as string),
    tenants_id: uuid().references(() => tenants.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
    }),
    ip_block: text().notNull(),
    start_ip: bigint("start_ip", { mode: "number" }).notNull(),
    end_ip: bigint("end_ip", { mode: "number" }).notNull(),
    priority: integer().notNull().default(0),
    action: accessRuleAction("action").notNull(),
    name: text().notNull(),
});

export const api_keys = pgTable("api_keys", {
    id: uuid("id")
        .primaryKey()
        .default(sql`uuidv7()` as unknown as string),
    hash: text().notNull().unique(),
    name: text().notNull(),
});

export const signing_keys = pgTable("signing_keys", {
    id: uuid("id")
        .primaryKey()
        .default(sql`uuidv7()` as unknown as string),
    key: text().notNull(),
    name: text().notNull(),
    api_keys_id: uuid()
        .references(() => api_keys.id, {
            onDelete: "cascade",
            onUpdate: "cascade",
        })
        .notNull(),
});

export const derivations = pgTable("derivations", {
    id: uuid("id")
        .primaryKey()
        .default(sql`uuidv7()` as unknown as string),
    signing_keys_id: uuid()
        .references(() => signing_keys.id, {
            onDelete: "cascade",
            onUpdate: "cascade",
        })
        .notNull(),
    cderiver: text().notNull(),
    cfilehash: text().notNull(),
    cfilesize: bigint("cfilesize", { mode: "number" }).notNull(),
    cnarhash: text().notNull(),
    cnarsize: text().notNull(),
    creferences: text().notNull(),
    csig: text().notNull(),
    cstorehash: text().notNull(),
    cstoresuffix: text().notNull(),
    parts: text().notNull(),
    compression: text({ enum: ["xz", "zstd"] }).notNull(),
});

export const derivations_tenants_links = pgTable("derivations_tenants_links", {
    id: uuid("id")
        .primaryKey()
        .default(sql`uuidv7()` as unknown as string),
    tenants_id: uuid()
        .references(() => tenants.id, {
            onDelete: "cascade",
            onUpdate: "cascade",
        })
        .notNull(),
    derivations_id: uuid()
        .references(() => derivations.id, {
            onDelete: "cascade",
            onUpdate: "cascade",
        })
        .notNull(),
    pin: boolean().default(false).notNull()
});

export const requests = pgTable("requests", {
    id: uuid("id")
        .primaryKey()
        .default(sql`uuidv7()` as unknown as string),
    derivations_tenants_links: uuid()
        .references(() => derivations_tenants_links.id, {
            onDelete: "cascade",
            onUpdate: "cascade",
        })
        .notNull(),
    direction: text({ enum: ["inbound", "outbound"] }).notNull(),
    date: bigint("date", { mode: "number" })
        .default(sql`EXTRACT(EPOCH FROM NOW())::BIGINT`)
        .notNull(),
    url: text().notNull(),
});

export const api_keys_tenants_link = pgTable("api_keys_tenants_link", {
    id: uuid("id")
        .primaryKey()
        .default(sql`uuidv7()` as unknown as string),
    tenants_id: uuid()
        .references(() => tenants.id, {
            onDelete: "cascade",
            onUpdate: "cascade",
        })
        .notNull(),
    api_keys_id: uuid()
        .references(() => api_keys.id, {
            onDelete: "cascade",
            onUpdate: "cascade",
        })
        .notNull(),
});

export const uploads = pgTable("uploads", {
    id: uuid("id")
        .primaryKey()
        .default(sql`uuidv7()` as unknown as string),
    tenants_id: uuid()
        .references(() => tenants.id, {
            onDelete: "cascade",
            onUpdate: "cascade",
        })
        .notNull(),
    signed_by: uuid()
        .references(() => api_keys.id, {
            onDelete: "cascade",
            onUpdate: "cascade",
        })
        .notNull(),
    md5: text().notNull(),
    compression: text({ enum: ["xz", "zstd"] }).notNull(),
});

export const deployments = pgTable("deployments", {
    id: uuid("id")
        .primaryKey()
        .default(sql`uuidv7()` as unknown as string),
    tenants_id: uuid()
        .references(() => tenants.id, {
            onDelete: "cascade",
            onUpdate: "cascade",
        })
        .notNull(),
    key_used: uuid()
        .references(() => deployment_keys.id, {
            onDelete: "cascade",
            onUpdate: "cascade",
        })
        .notNull(),
    deployment_index: integer().notNull(),
    created_at: bigint("created_at", { mode: "number" })
        .default(sql`EXTRACT(EPOCH FROM NOW())::BIGINT`)
        .notNull(),
    start_time: bigint("start_time", { mode: "number" })
        .default(sql`EXTRACT(EPOCH FROM NOW())::BIGINT`)
        .notNull(),
    end_time: bigint("end_time", { mode: "number" })
        .default(sql`EXTRACT(EPOCH FROM NOW())::BIGINT`)
        .notNull(),
    status: text({ enum: ["Pending", "InProgress", "Cancelled", "Failed", "Succeeded"] }).notNull(),
    deploy_json: text().notNull(),
});

export const agents = pgTable(
    "agents",
    {
        id: uuid("id")
            .unique()
            .default(sql`uuidv7()` as unknown as string)
            .notNull(),
        tenants_id: uuid()
            .references(() => tenants.id, {
                onDelete: "cascade",
                onUpdate: "cascade",
            })
            .notNull(),
        last_key_used: uuid()
            .references(() => deployment_keys.id, {
                onDelete: "cascade",
                onUpdate: "cascade",
            })
            .notNull(),
        last_seen: bigint("last_seen", { mode: "number" })
            .default(sql`EXTRACT(EPOCH FROM NOW())::BIGINT`)
            .notNull(),
        version: text().notNull(),
        os: text().notNull(),
        is_online: boolean().notNull(),
        name: text().notNull(),
    },
    (t) => [primaryKey({ columns: [t.tenants_id, t.name] })],
);

export const agents_deployments_links = pgTable("agents_deployments_links", {
    id: uuid("id")
        .primaryKey()
        .default(sql`uuidv7()` as unknown as string),
    deployments_id: uuid()
        .references(() => deployments.id, {
            onDelete: "cascade",
            onUpdate: "cascade",
        })
        .notNull(),
    agents_id: uuid()
        .references(() => agents.id, {
            onDelete: "cascade",
            onUpdate: "cascade",
        })
        .notNull(),
    log: text(),
    started_at: bigint("started_at", { mode: "number" })
        .default(sql`EXTRACT(EPOCH FROM NOW())::BIGINT`)
        .notNull(),
    finished_at: bigint("finished_at", { mode: "number" }).default(
        sql`EXTRACT(EPOCH FROM NOW())::BIGINT`,
    ),
    closure_size: integer(),
    store_path: text().notNull(),
    status: text({ enum: ["Pending", "InProgress", "Cancelled", "Failed", "Succeeded"] }).notNull(),
});

export const deployment_keys = pgTable("deployment_keys", {
    id: uuid("id")
        .primaryKey()
        .default(sql`uuidv7()` as unknown as string),
    tenants_id: uuid()
        .references(() => tenants.id, {
            onDelete: "cascade",
            onUpdate: "cascade",
        })
        .notNull(),
    type: text({ enum: ["agent", "activate"] }).notNull(),
    hash: text().notNull().unique(),
    expires_at: bigint("expires_at", { mode: "number" })
        .default(sql`EXTRACT(EPOCH FROM NOW())::BIGINT`)
        .notNull(),
    created_at: bigint("created_at", { mode: "number" })
        .default(sql`EXTRACT(EPOCH FROM NOW())::BIGINT`)
        .notNull(),
    name: text().notNull(),
});
