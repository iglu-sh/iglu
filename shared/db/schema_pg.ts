import { boolean, jsonb, date, integer, pgTable, text, uuid, primaryKey } from "drizzle-orm/pg-core";

export const tenants = pgTable("tenants", {
    id: uuid("id")
        .primaryKey()
        .default("uuidv7()"),
    github_username: text().notNull(),
    is_public: boolean().notNull(),
    name: text().notNull(),
    uri: text().notNull(),
    priority: integer().notNull(),
    ttl: integer().notNull().default(3600 * 24)
}) 

export const access_rules = pgTable("access_rules", {
    id: uuid("id")
        .primaryKey()
        .default("uuidv7()"),
    tenants_id: uuid().references(() => tenants.id, {
        onDelete: "cascade",
        onUpdate: "cascade"
    }),
    ip_block: text().notNull(),
    start_ip: integer().notNull(),
    end_ip: integer().notNull(),
    priority: integer().notNull().default(0),
    action: text({enum: ["drop", "accept"]}).notNull(),
    name: text().notNull()
})

export const api_keys = pgTable("api_keys", {
    id: uuid("id")
        .primaryKey()
        .default("uuidv7()"),
    hash: text().notNull().unique(),
    name: text().notNull()
})

export const signing_keys = pgTable("signing_keys", {
    id: uuid("id")
        .primaryKey()
        .default("uuidv7()"),
    key: text().notNull(),
    name: text().notNull(),
    api_keys_id: uuid().references(() => api_keys.id, {
        onDelete: "cascade",
        onUpdate: "cascade"
    }).notNull(),   
})

export const derivations = pgTable('derivations', {
    id: uuid("id")
        .primaryKey()
        .default("uuidv7()"),
    signing_keys_id: text().references(() => signing_keys.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
    }).notNull(),
    cderiver: text().notNull(),
    cfilehash: text().notNull(),
    cfilesize: integer().notNull(),
    cnarhash: text().notNull(),
    cnarsize: text().notNull(),
    creferences: text().notNull(),
    csig: text().notNull(),
    cstorehash: text().notNull(),
    cstoresuffix: text().notNull(),
    parts: jsonb().notNull(),
    compression: text({ enum: ["xz", "zstd"] }).notNull(),
})

export const derivations_tenants_links = pgTable("derivations_tenants_links", {
    id: uuid("id")
        .primaryKey()
        .default("uuidv7()"),
    tenants_id: uuid().references(() => tenants.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
    }).notNull(),
    derivations_id: uuid().references(() => derivations.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
    }).notNull(),
});

export const requests = pgTable("requests", {
    id: uuid("id")
        .primaryKey()
        .default("uuidv7()"),
    derivations_tenants_links: uuid()
        .references(() => derivations_tenants_links.id, {
            onDelete: "cascade",
            onUpdate: "cascade",
        })
        .notNull(),
    direction: text({ enum: ["inbound", "outbound"] }).notNull(),
    date: date().default('now()').notNull(),
    url: text().notNull(),
});

export const api_keys_tenants_link = pgTable("api_keys_tenants_link", {
    id: uuid("id")
        .primaryKey()
        .default("uuidv7()"),
    tenants_id: uuid().references(() => tenants.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
    }).notNull(),
    api_keys_id: uuid().references(() => api_keys.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
    }).notNull(),
});

export const uploads = pgTable("uploads", {
    id: uuid("id")
        .primaryKey()
        .default("uuidv7()"),
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
        .default("uuidv7()"),
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
    created_at: date().default("now()").notNull(),
    start_time: integer().notNull(),
    end_time: integer().notNull(),
    status: text({ enum: ["Pending", "InProgress", "Cancelled", "Failed", "Succeeded"] }).notNull(),
    deploy_json: text().notNull(),
});


export const agents = pgTable(
    "agents",
    {
        id: uuid("id")
            .unique()
            .default("uuidv7()"),
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
        last_seen: date().default("now()").notNull(),
        version: text().notNull(),
        os: text().notNull(),
        is_online: boolean().notNull(),
        name: text().notNull(),
    },
    (t) => [primaryKey({ columns: [t.tenants_id, t.name] })],
);

export const agents_deployments_links = pgTable("agents_deployments_links", {
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
    started_at: date().default("now()").notNull(),
    finished_at: integer(),
    closure_size: integer(),
    store_path: text().notNull(),
    status: text({ enum: ["Pending", "InProgress", "Cancelled", "Failed", "Succeeded"] }).notNull(),
});

export const deployment_keys = pgTable("deployment_keys", {
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
    expires_at: date().default("now()").notNull(),
    created_at: date().default("now()").notNull(),
    name: text().notNull(),
});
