import z from "zod";

export const deploy_json_schema = z.object({
    agents: z.record(z.string(), z.string()),
    rollbackScripts: z.record(z.string(), z.string()).optional(),
});

export const deploy_activate_response = z.object({
    id: z.string(),
    agents: z.record(z.string(), z.object({
        id: z.string(),
        url: z.url()
    })),
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

export const deploy_info_schema = z.object({
    closureSize: z.number().nullable(),
    createdOn: z.iso.datetime(),
    finishedOn: z.iso.datetime().nullable(),
    id: z.uuidv7(),
    index: z.number(),
    startedOn: z.iso.datetime(),
    status: z.enum(["InProgress", "Pending", "Cancelled", "Failed", "Succeeded" ]),
    storePath: z.string()
})
