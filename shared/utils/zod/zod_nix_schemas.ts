import {z} from 'zod'

export const nar_info_schema = z.object({
    StorePath: z.string(),
    URL: z.string(),
    Compression: z.enum(["zstd", "xz"]),
    FileHash: z.string(),
    FileSize: z.string().regex(/^\d+$/, "String must contain only numbers"),
    NarHash: z.string(),
    NarSize: z.string().regex(/^\d+$/, "String must contain only numbers"),
    References: z.string(),
    Deriver: z.string(),
    Sig: z.string()
})

export const tenant_info_schema = z.object({
    StoreDir: z.string(),
    WantMassQuery: z.string(),
    Priority: z.string()
})
