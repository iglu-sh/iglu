import { sqliteTable, integer, text, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
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
    api_keys_id: text().references(() => api_keys.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
    }).notNull(),
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
    compression: text({enum: ['xz', 'zstd']}).notNull(),
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
    derivations_tenants_links: text().references(() => derivations_tenants_links.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
    }).notNull(),
    direction: text({enum: ['inbound', 'outbound']}).notNull(),
    date: text().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
    url: text("url").notNull(),
});

export const api_keys = sqliteTable("api_keys", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => Bun.randomUUIDv7()),
    hash: text().notNull(),
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

export const uploads = sqliteTable('uploads', {
    id: text("id")
        .primaryKey()
        .$defaultFn(()=> Bun.randomUUIDv7()),
    tenants_id: text().references(() => tenants.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
    }).notNull(),
    signed_by: text().references(() => api_keys.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
    }).notNull(),
    md5: text().notNull(),
    compression: text({enum: ['xz', 'zstd']}).notNull() 
})
