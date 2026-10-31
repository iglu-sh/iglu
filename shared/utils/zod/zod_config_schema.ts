import { z } from "zod";
import { Logger } from "@/shared/logger";
import { api_keys_schema, signing_keys_schema, tenant_schema } from "./zod_db_schemas";

export const config_schema = z.object({
    config: z.object({
        reconcile: z.object({
            mode: z.enum(["off", "authorative", "additive"]).default("authorative"),
        }),
    }),
    database: z.object({
        database_type: z.enum(["sqlite", "postgres"]),
        database_file_location: z
            .string()
            .nullish()
            .transform((val) => val ?? "<empty>"),
        user: z
            .string()
            .nullish()
            .transform((val) => val ?? "<empty>"),
        host: z
            .string()
            .nullish()
            .transform((val) => val ?? "<empty>"),
        password: z
            .string()
            .nullish()
            .transform((val) => val ?? "<empty>"),
        port: z
            .number()
            .nullish()
            .transform((val) => val ?? -1),
        name: z
            .string()
            .nullish()
            .transform((val) => val ?? "iglu"),
    }),
    logger: z.object({
        logging_format: z.enum(["pretty", "json"]),
        log_level: z.enum(["debug", "info", "warn", "error"]),
        logging_prefix: z.string().optional(),
        logging_prefix_color: z
            .enum(["gray", "green", "yellow", "red", "blue", "magenta", "cyan", "white"])
            .optional(),
        should_log_requests: z.boolean(),
    }),
    server: z
        .object({
            hostname: z.string(),
            interface: z.ipv4().default("0.0.0.0"),
            port: z.uint32().default(80),
            hashing_secret: z.string().optional(),
            hashing_secret_file: z.string().optional(),
            enable_rest: z.boolean().default(true),
            enable_info: z.boolean().default(true),
            encryption: z.object({
                secret: z.string().default("<empty>"),
            }),
            trusted_proxies: z.array(z.ipv4()).default([]),
            use_reverse_proxy: z.boolean().default(false),
        })
        .refine(
            (data) =>
                (data.hashing_secret !== undefined) !== (data.hashing_secret_file !== undefined),
            {
                message:
                    "One and only one of server.hashing_secret_file or server.hashing_secret has to be set.",
            },
        ),
    storage: z.object({
        storage_type: z.enum(["fs", "s3"]),
        binary_storage_directory: z.string(),
        s3: z
            .object({
                endpoint: z.string(),
                access_key_id: z.string(),
                secret_access_key: z.string(),
                forcePathStyle: z.boolean().optional().default(true),
                request_checksum_calculation: z
                    .enum(["WHEN_REQUIRED", "WHEN_SUPPORTED"])
                    .optional()
                    .default("WHEN_REQUIRED"),
                response_checksum_validation: z
                    .enum(["WHEN_REQUIRED", "WHEN_SUPPORTED"])
                    .optional()
                    .default("WHEN_REQUIRED"),
                region: z.string().optional().default("us-east-1"),
                bucket: z.string(),
            })
            .optional(),
    }),

    tenants: z.record(
        z.string(),
        z.object({
            github_username: z.string(),
            is_public: z.boolean(),
            name: z.string(),
            preferred_compression_method: z.enum(["xz", "zstd"]),
            priority: z.number(),
            ttl: z.string(),
            signing_method: z.enum(["client", "server"]),
        }),
    ),

    api_keys: z
        .record(
            z.string(),
            z.object({
                out_file: z.string().default("~/.share/iglu/keyoutput.toml"),
                in_file: z.string().nullable().default(null),
                generated: z.boolean().nullable().default(false),
                plaintext_key: z.string().nullable().default(null),
                tenant: z.string(),
            }),
        )
        .superRefine((val, ctx) => {
            if (!val.data) {
                Logger.debug(`Unable to validate zod api keys schema as val.data is undefined`);
                return;
            }
            if (val.data.in_file !== null && val.data && val.data.out_file === "") {
                Logger.warn(
                    `You have set both in_file and out_file. The out_file option is ignored in this case.`,
                );
            }
        }),

    public_keys: z
        .record(
            z.string(),
            z
                .object({
                    name: z.string(),
                    key: z.base64(),
                    linked_api_key: z.string(),
                })
                .superRefine((val, ctx) => {
                    const key_buffer = Buffer.from(val.key, "base64");
                    if (key_buffer.length !== 32) {
                        ctx.addIssue(
                            `This public key is not the correct size of a cachix public key (must be 32 Bytes base64)`,
                        );
                    }
                }),
        )
        .default({}),

    deployment_keys: z
        .record(
            z.string(),
            z
                .object({
                    name: z.string(),
                    type: z.enum(["agent", "activate"]),
                    expires_at: z.union([z.iso.datetime(), z.string()]),
                    tenant: z.string(),
                    in_file: z.string().nullable().default(null),
                    generated: z.boolean().default(false),
                    plaintext_key: z.string().nullable().default(null),
                    out_file: z.string().default("~/.share/iglu/keyoutput.toml"),
                })
                .superRefine((val, ctx) => {
                    if (val.in_file && val.generated) {
                        ctx.addIssue(
                            `You have set both in_file and generated set to true. Either set in_file and generated set to false or remove the in_file attribute and leave generated as true`,
                        );
                    }

                    if (val.plaintext_key === null && val.generated) {
                        ctx.addIssue(
                            `You have set both plaintext_key and generated to true. Either set generated to false or remove the plaintext_key attribute`,
                        );
                    }

                    if (val.in_file && val.plaintext_key) {
                        ctx.addIssue(
                            `You have set both plaintext_key and in_file. Decide between one of the two options and remove one of these attributes`,
                        );
                    }

                    if (val.in_file === null && !val.generated && val.plaintext_key === null) {
                        ctx.addIssue(
                            `You have not set one of the generation options for the keypair. Decide between one of these: 'in_file', 'generated' or 'plaintext_key' or remove the defined keypair all together so that Iglu generates it itself`,
                        );
                    }

                    if (val.out_file && val.in_file) {
                        Logger.warn(
                            `Config: You have set both in_file and out_file. The out_file option is ignored in that case`,
                        );
                    }

                    if (val.out_file && val.plaintext_key) {
                        Logger.warn(
                            `Config: You have set both plaintext_key and out_file. The out_file option is ignored in that case`,
                        );
                    }
                }),
        )
        .default({}),

    keypairs: z
        .record(
            z.string(),
            z
                .object({
                    signing_key: z.string(),
                    tenant: z.string(),
                    in_file: z.string().nullable().default(null),
                    generated: z.boolean().default(false),
                    plaintext_key: z.base64().nullable().default(null),
                })
                .superRefine((val, ctx) => {
                    if (val.in_file && val.generated) {
                        ctx.addIssue(
                            `You have set both in_file and generated set to true. Either set in_file and generated set to false or remove the in_file attribute and leave generated as true`,
                        );
                    }

                    if (val.plaintext_key === null && val.generated) {
                        ctx.addIssue(
                            `You have set both plaintext_key and generated to true. Either set generated to false or remove the plaintext_key attribute`,
                        );
                    }

                    if (val.in_file && val.plaintext_key) {
                        ctx.addIssue(
                            `You have set both plaintext_key and in_file. Decide between one of the two options and remove one of these attributes`,
                        );
                    }

                    if (val.in_file === null && !val.generated && val.plaintext_key === null) {
                        ctx.addIssue(
                            `You have not set one of the generation options for the keypair. Decide between one of these: 'in_file', 'generated' or 'plaintext_key' or remove the defined keypair all together so that Iglu generates it itself`,
                        );
                    }

                    if (val.plaintext_key) {
                        const key_buffer = Buffer.from(val.plaintext_key, "base64");
                        if (key_buffer.length !== 32) {
                            ctx.addIssue(
                                `The key that is defined in plaintext_key is not of the correct length (base64 32 bytes)`,
                            );
                        }
                    }
                }),
        )
        .default({}),
});

export const database_version_schema = z.object({
    id: z.number(),
    state: z.object({
        tenants: z.array(
            z.object({
                id: z.uuidv7(),
                managed_by: z.literal("configuration"),
                mapped_from: z.string(),
                ttl: z.string(),
                uri: z.string(),
                name: z.string(),
                priority: z.number(),
                is_public: z.boolean(),
                permission: z.string(),
                signing_method: z.enum(["client", "server"]),
                github_username: z.string(),
                preferred_compression_method: z.enum(["xz", "zstd"]),
            }),
        ),
        api_keys: z.array(
            z.object({
                id: z.uuidv7(),
                in_file: z.string(),
                generated: z.boolean(),
                tenant: z.string(),
                managed_by: z.literal("configuration"),
                mapped_from: z.string(),
                hash: z.string(),
                name: z.string(),
                out_file: z.string(),
                tenants_id: tenant_schema,
            }),
        ),
        public_keys: z.array(
            z.object({
                id: z.uuidv7(),
                managed_by: z.literal("configuration"),
                mapped_from: z.string(),
                key: z.string(),
                name: z.string(),
                api_keys_id: api_keys_schema,
            }),
        ),
        deployment_keys: z.array(
            z.object({
                id: z.uuidv7(),
                in_file: z.string(),
                generated: z.boolean(),
                tenant: z.string(),
                managed_by: z.literal("configuration"),
                type: z.enum(["agent", "activate"]),
                mapped_from: z.string(),
                hash: z.string(),
                name: z.string(),
                created_at: z.number(),
                expires_at: z.number(),
                tenants_id: tenant_schema,
            }),
        ),
        keypairs: z.array(
            z.object({
                id: z.uuidv7(),
                in_file: z.string(),
                generated: z.boolean(),
                tenant: z.string(),
                managed_by: z.literal("configuration"),
                mapped_from: z.string(),
                signing_key: z.string(),
                tenants_id: tenant_schema,

                // HASH of private key not the actual one
                private_key: z.string(),
                signing_keys_id: signing_keys_schema,
            }),
        ),
    }),
    meta: z.object({
        rebuild_date: z.number(),
        name: z.string(),
        previous_generation_id: z.number(),
    }),
});
