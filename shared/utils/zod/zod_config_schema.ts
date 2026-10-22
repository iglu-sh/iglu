import { z } from "zod";
import { Logger } from "@/shared/logger";

export const config_schema = z.object({
    config: z.object({
        reconcile: z.object({
            mode: z.enum(["off", "authorative", "additive"]),
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
                secret_file: z.string(),
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
            z.object({
                name: z.string(),
                key: z.base64(),
                linked_api_key: z.string(),
            }),
        )
        .superRefine((val, ctx) => {
            if (!val.data) {
                Logger.debug(`Unable to validate zod public key schema as val.data is undefined`);
                return;
            }
            const key_buffer = Buffer.from(val.data.key, "base64");
            if (key_buffer.length !== 32) {
                ctx.addIssue(
                    `This public key is not the correct size of a cachix public key (must be 32 Bytes base64)`,
                );
            }
        }),

    deployment_keys: z.record(
        z.string(),
        z.object({
            name: z.string(),
            type: z.enum(["agent", "activate"]),
            expires_at: z.union([z.iso.datetime(), z.string()]),
            tenant: z.string(),
            in_file: z.string().nullable().default(null),
            generated: z.boolean().default(false),
            plaintext_key: z.string().nullable().default(null),
        }),
    ),
});
