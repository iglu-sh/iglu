import { uuid, pgTable, varchar, boolean, integer, text, date } from "drizzle-orm/pg-core";

export const tenants = pgTable("tenants", {
    id: uuid().primaryKey().generatedAlwaysAs("identity"),
    github_username: varchar({ length: 1024 }).notNull(),
    is_public: boolean().notNull(),
    name: varchar({ length: 1024 }).notNull(),
    permission: varchar({ length: 1024 }).notNull(),
    preferred_compression_method: varchar({ length: 1024 }).notNull(),
    uri: varchar({ length: 1024 }).notNull(),
    priority: integer().notNull(),
});

export const access_rules = pgTable("access_rules", {
    id: uuid().primaryKey().generatedAlwaysAs("identity"),
    tenants_id: uuid().references(() => tenants.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
    }),
    ip_block: text().notNull(),
    action: text().notNull(), // May be drop or accept, by default accepts everything and if a cache is set to private, then everything is blocked until explicitly allowed
});

export const signing_keys = pgTable("signing_keys", {
    id: uuid().primaryKey().generatedAlwaysAs("identity"),
    key: text(),
});

export const derivations = pgTable("derivations", {
    id: uuid().primaryKey().generatedAlwaysAs("identity"),
    signing_keys_id: uuid().references(() => signing_keys.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
    }),
    cderiver: text().notNull(),
    cfilehash: text().notNull(),
    cnarhash: text().notNull(),
    cnarsize: text().notNull(),
    creferences: text().notNull(),
    csig: text().notNull(),
    cstorehash: text().notNull(),
    cstoresuffix: text().notNull(),
    parts: text().notNull(),
    compression: text().notNull(),
});

export const derivations_tenants_links = pgTable("derivations_tenants_links", {
    id: uuid().primaryKey().generatedAlwaysAs("identity"),
    tenants_id: uuid().references(() => tenants.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
    }),
    derivations_id: uuid().references(() => derivations.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
    }),
});

export const requests = pgTable("requests", {
    id: uuid().primaryKey().generatedAlwaysAs("identity"),
    derivations_tenants_links: uuid().references(() => derivations_tenants_links.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
    }),
    direction: text().notNull(),
    date: date().notNull(),
    url: text().notNull,
});

export const api_keys = pgTable("api_keys", {
    id: uuid().primaryKey().generatedAlwaysAs("identity"),
    signing_keys_id: uuid().references(() => signing_keys.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
    }),
    hash: text().notNull(),
});

export const api_keys_tenants_link = pgTable("api_keys_tenants_link", {
    id: uuid().primaryKey().generatedAlwaysAs("identity"),
    tenants_id: uuid().references(() => tenants.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
    }),
    api_keys_id: uuid().references(() => api_keys.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
    }),
});
