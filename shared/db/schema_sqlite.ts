import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
export const tenants = sqliteTable("tenants", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => Bun.randomUUIDv7()),
    github_username: text().notNull(),
    is_public: integer({ mode: "boolean" }).notNull(),
    name: text().notNull().unique(),
    permission: text().notNull(),
    preferred_compression_method: text().notNull(),
    uri: text().notNull(),
    priority: integer().notNull(),
    ttl: integer()
        .notNull()
        .default(3600 * 24), // The default time to live for a cache is 1 day,
});

export const access_rules = sqliteTable(
    "access_rules",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => Bun.randomUUIDv7()),
        tenants_id: text().references(() => tenants.id, {
            onDelete: "cascade",
            onUpdate: "cascade",
        }),
        ip_block: text().notNull(),
        start_ip: integer().notNull(),
        end_ip: integer().notNull(),
        priority: integer().notNull().default(0),
        action: text({ enum: ["drop", "accept"] }).notNull(), // May be drop or accept, by default accepts everything and if a cache is set to private, then everything is blocked until explicitly allowed
        name: text().notNull(),
    },
    (table) => [index("ip_idx").on(table.start_ip, table.end_ip)],
);

export const signing_keys = sqliteTable("signing_keys", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => Bun.randomUUIDv7()),
    key: text().notNull(),
    api_keys_id: text()
        .references(() => api_keys.id, {
            onDelete: "cascade",
            onUpdate: "cascade",
        })
        .notNull(),
    name: text().notNull(),
});

export const derivations = sqliteTable("derivations", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => Bun.randomUUIDv7()),
    signing_keys_id: text().references(() => signing_keys.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
    }),
    cderiver: text().notNull(),
    cfilehash: text().notNull(),
    cfilesize: integer().notNull(),
    cnarhash: text().notNull(),
    cnarsize: text().notNull(),
    creferences: text().notNull(),
    csig: text().notNull(),
    cstorehash: text().notNull(),
    cstoresuffix: text().notNull(),
    parts: text().notNull(),
    compression: text({ enum: ["xz", "zstd"] }).notNull(),
});

export const derivations_tenants_links = sqliteTable("derivations_tenants_links", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => Bun.randomUUIDv7()),
    tenants_id: text().references(() => tenants.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
    }),
    derivations_id: text().references(() => derivations.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
    }),
});

export const requests = sqliteTable("requests", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => Bun.randomUUIDv7()),
    derivations_tenants_links: text()
        .references(() => derivations_tenants_links.id, {
            onDelete: "cascade",
            onUpdate: "cascade",
        })
        .notNull(),
    direction: text({ enum: ["inbound", "outbound"] }).notNull(),
    date: integer().default(sql`(unixepoch())`).notNull(),
    url: text("url").notNull(),
});

export const api_keys = sqliteTable("api_keys", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => Bun.randomUUIDv7()),
    hash: text().notNull().unique(),
    name: text().notNull(),
});

export const api_keys_tenants_link = sqliteTable("api_keys_tenants_link", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => Bun.randomUUIDv7()),
    tenants_id: text().references(() => tenants.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
    }),
    api_keys_id: text().references(() => api_keys.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
    }),
});

export const uploads = sqliteTable("uploads", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => Bun.randomUUIDv7()),
    tenants_id: text()
        .references(() => tenants.id, {
            onDelete: "cascade",
            onUpdate: "cascade",
        })
        .notNull(),
    signed_by: text()
        .references(() => api_keys.id, {
            onDelete: "cascade",
            onUpdate: "cascade",
        })
        .notNull(),
    md5: text().notNull(),
    compression: text({ enum: ["xz", "zstd"] }).notNull(),
});

export const deployments = sqliteTable("deployments", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => Bun.randomUUIDv7()),
    tenants_id: text()
        .references(() => tenants.id, {
            onDelete: "cascade",
            onUpdate: "cascade",
        })
        .notNull(),
    key_used: text()
        .references(() => deployment_keys.id, {
            onDelete: "cascade",
            onUpdate: "cascade",
        })
        .notNull(),
    deployment_index: integer().notNull(),
    created_at: integer().default(sql`(unixepoch())`).notNull(),
    start_time: integer().notNull(),
    end_time: integer().notNull(),
    status: text({ enum: ["Pending", "InProgress", "Cancelled", "Failed", "Succeeded"] }).notNull(),
    deploy_json: text().notNull(),
});

export const agents = sqliteTable(
    "agents",
    {
        id: text("id")
            .unique()
            .$defaultFn(() => Bun.randomUUIDv7()),
        tenants_id: text()
            .references(() => tenants.id, {
                onDelete: "cascade",
                onUpdate: "cascade",
            })
            .notNull(),
        last_key_used: text()
            .references(() => deployment_keys.id, {
                onDelete: "cascade",
                onUpdate: "cascade",
            })
            .notNull(),
        last_seen: integer().default(sql`(unixepoch())`).notNull(),
        version: text().notNull(),
        os: text().notNull(),
        is_online: integer({ mode: "boolean" }).notNull(),
        name: text().notNull(),
    },
    (t) => [primaryKey({ columns: [t.tenants_id, t.name] })],
);

export const agents_deployments_links = sqliteTable("agents_deployments_links", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => Bun.randomUUIDv7()),
    deployments_id: text()
        .references(() => deployments.id, {
            onDelete: "cascade",
            onUpdate: "cascade",
        })
        .notNull(),
    agents_id: text()
        .references(() => agents.id, {
            onDelete: "cascade",
            onUpdate: "cascade",
        })
        .notNull(),
    log: text(),
    started_at: integer().default(sql`(unixepoch())`).notNull(),
    finished_at: integer(),
    closure_size: integer(),
    store_path: text().notNull(),
});

export const deployment_keys = sqliteTable("deployment_keys", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => Bun.randomUUIDv7()),
    tenants_id: text()
        .references(() => tenants.id, {
            onDelete: "cascade",
            onUpdate: "cascade",
        })
        .notNull(),
    type: text({ enum: ["agent", "activate"] }).notNull(),
    hash: text().notNull().unique(),
    expires_at: integer().default(sql`(unixepoch())`).notNull(),
    created_at: integer().default(sql`(unixepoch())`).notNull(),
    name: text().notNull(),
});
