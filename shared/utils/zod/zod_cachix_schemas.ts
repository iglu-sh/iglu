import z from "zod";

export const deploy_json_schema = z.object({
    agents: z.record(z.string(), z.string()),
    rollbackScripts: z.record(z.string(), z.string()).optional(),
});

export const deploy_activate_response = z.object({
    id: z.string(),
    agents: z.record(z.string(), z.string()),
});

export const nix_tenant_information_schema = z.object({
    githubUsername: z.string(),
    isPublic: z.boolean(),
    name: z.string(),
    permission: z.string(),
    preferredCompressionMethod: z.enum(["XZ", "ZSTD"]),
    publicSigningKeys: z.array(z.string()),
    uri: z.string(),
    priority: z.number(),
});

export const multipart_nar_schema = z.object({
    uploadId: z.uuidv7(),
    narId: z.uuidv7()
})

export const multipart_nar_uid_initialization_schema = z.object({
    uploadUrl: z.url()
})
