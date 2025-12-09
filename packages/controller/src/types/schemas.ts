import type {arch} from '@iglu-sh/types/controller'
import {z} from 'zod'
export const builderSchema = z.object({
    builder: z.object({
        id: z.number(),
        cache_id: z.number(),
        name: z.string().nonempty(),
        description: z.string().optional(),
        enabled: z.boolean(),
        trigger: z.enum(['manual', 'cron', 'webhook']),
        cron: z.string().optional(),
        webhookurl: z.string().optional(),
        arch: z.enum([
            'x86_64-linux',
            'aarch64-linux',
            'armv7l',
            'i686',
            'riscv64',
            "aarch64-darwin",
            "x86_64-darwin"
        ])
    }),
    cachix_config: z.object({
        id: z.number(),
        builder_id: z.number(),
        push: z.boolean(),
        target: z.number(),
        apikey: z.string().optional(),
        signingkey: z.string().optional(),
        buildoutpudir: z.string().optional()
    }),
    git_config: z.object({
        id: z.number(),
        builder_id: z.number(),
        repository: z.string().url(),
        branch: z.string().optional(),
        gitusername: z.string().optional(),
        gitkey: z.string().optional(),
        requiresauth: z.boolean(),
        noclone: z.boolean()
    }),
    build_options: z.object({
        id: z.number(),
        builder_id: z.number(),
        cores: z.number().int().positive(),
        maxjobs: z.number().int().positive(),
        keep_going: z.boolean(),
        extraargs: z.string().optional(),
        command: z.string().nonempty(),
        substituters: z.array(z.object({
            url: z.string().url(),
            public_signing_keys: z.array(z.string()).nonempty()
        }))
    })
})
