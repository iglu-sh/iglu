import { createTRPCRouter, protectedProcedure } from "../trpc";
import Logger from "@iglu-sh/logger";
import z from "zod";
import Database from "@/lib/db";
import type { hash, hash_cache_link } from "@iglu-sh/types";
import { db, Cache, Hash_cache_link } from "@iglu-sh/common";
import DynamicDatabase = db.DynamicDatabase;

export const pkgs = createTRPCRouter({
    getPkgsForCache: protectedProcedure
        .input(z.object({ cacheId: z.string() }))
        .query(async ({ ctx, input }): Promise<{
            count: number;
            total_storage_used_gb: number;
            excerpt: Array<hash>
        }> => {
            // Get the cache
            const dbDynamic = new DynamicDatabase();
            let returnData: {
                count: number;
                total_storage_used_gb: number;
                excerpt: Array<hash>
            } = {
                count: 0,
                total_storage_used_gb: 0,
                excerpt: [],
            }
            try{
                const cache = await new Cache(dbDynamic).getById(input.cacheId);
                // Get the hashes by cache
                const hashesByCache = await new Hash_cache_link(dbDynamic).getByCacheId(input.cacheId);
                await dbDynamic.disconnect();
                returnData.count = hashesByCache.length;
                // Calculate total storage used in GB
                const totalStorageUsedBytes = hashesByCache.reduce((acc, curr) => acc + curr.hash.cfilesize, 0);
                returnData.total_storage_used_gb = totalStorageUsedBytes / (1024 ** 3);
                // Get an excerpt of the first 50 hashes
                const excerptHashes = hashesByCache.slice(0, 50).map(link => link.hash);
                returnData.excerpt = excerptHashes;
            }
            catch(e){
                Logger.error("Failed to connect to dynamic database");
                Logger.debug(`${e}`);
                await dbDynamic.disconnect();
                throw new Error("Failed to query pkgs");
            }

            return returnData
        }),
    getPkgsByCacheId: protectedProcedure
        .input(z.object({ cacheId: z.string(), offset: z.number().optional().default(0), limit: z.number().optional().default(25) }))
        .query(async ({ ctx, input }): Promise<hash[]> => {
            const dbDynamic = new DynamicDatabase();
            let returnData: hash[] = []
            try{
                await dbDynamic.connect()
                // Get the cache to ensure it exists
                const cache = await new Cache(dbDynamic).getById(input.cacheId)
                // Now get the hashe_cache_links for this cache with pagination
                const hashCacheLinks: hash_cache_link[] = await new Hash_cache_link(dbDynamic).getByCacheId(input.cacheId)
                const paginatedLinks = hashCacheLinks.slice(input.offset, input.offset + input.limit);
                returnData = paginatedLinks.map(link => link.hash);
                await dbDynamic.disconnect();
            }
            catch(e){
                await dbDynamic.disconnect();
            }
            return returnData;
        })
});
