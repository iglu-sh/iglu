import { z } from "zod";

import {
    createTRPCRouter,
    protectedProcedure,
} from "@/server/api/trpc";
import type * as dbTypes from "@/types/db";
import Database from "@/lib/db";
import Logger from "@iglu-sh/logger";
import type {cacheCreationObject} from "@/types/frontend";
import type {cacheOverview} from "@/types/api";
import type {keys, public_signing_keys} from "@/types/db";

export const cache = createTRPCRouter({
    byUser: protectedProcedure
        .query(async ({ctx}):Promise<dbTypes.cache[]>=>{
            // Here you would fetch the caches for the user from the database
            // For now, we will return a dummy cache
            if(!ctx.session.user){
                return []
            }
            let data = [] as dbTypes.cache[];
            const db = new Database()
            try{
                await db.connect()
                data = await db.getCachesByUserId(ctx.session.user.id)
            }
            catch(err){
                Logger.error(`Failed to connect to DB ${err}`);
            }
            await db.disconnect()
            return data;
        }),
    createCache: protectedProcedure
        .input(z.custom<cacheCreationObject>())
        .mutation(async ({ctx, input}) => {
            const db = new Database();
            try{
                await db.connect();
                const cache = await db.createCache(ctx.session.user.id, input).catch((err => {
                    Logger.error(`Failed to create cache: ${err}`);
                    throw new Error(JSON.stringify({message: "Failed to create cache", cause: "Already exists"}))
                }));
                await db.disconnect();
                console.log(cache)
                return cache;
            }
            catch(err){
                Logger.error(`Failed to create cache: ${err}`);
                await db.disconnect();
                throw new Error(err as string || "Failed to create cache");
            }
        }),
    getOverview: protectedProcedure
        .input(z.object({cacheID: z.number()}))
        .query(async ({ctx, input}):Promise<cacheOverview> => {
            const db = new Database();

            try {
                await db.connect()
                const availableCachesPerUser = await db.getCachesByUserId(ctx.session.user.id)
                const user = await db.getUserById(ctx.session.user.id);
                if(!availableCachesPerUser.find(c => c.id === input.cacheID) && !user?.is_admin){
                    throw new Error("You do not have access to this cache");
                }

                const cacheInfo = await db.getCacheById(input.cacheID);
                if(!cacheInfo){
                    throw new Error("Cache not found");
                }
                const cacheOverview: cacheOverview = {
                    info: cacheInfo,
                    audit_log: [],
                    packages: {
                        total: 0,
                        storage_used: 0
                    }
                }

                // Fetch the audit log for the cache
                cacheOverview.audit_log = await db.getAuditLogByCacheId(input.cacheID);

                await db.disconnect()
                return cacheOverview
            }
            catch(err){
                Logger.error(`Failed to get cacheOverview: ${err}`);
                await db.disconnect()
                throw new Error(err as string || "Failed to get cacheOverview");
            }
        }),
    getBuilders: protectedProcedure
        .query(async ({ctx, input}) => {

        }),
    getKeys: protectedProcedure
        .input(z.object({cacheID: z.number()}))
        .query(async ({ctx, input}):Promise<Array<{
            apikey:keys,
            public_signing_keys:public_signing_keys[],
            user: {
                id: string,
                username: string,
                updated_at: Date,
                avatar_color: string,
                email: string,
                is_admin: boolean
            }
        }>> => {
            const db = new Database()
            let returnValue:{
                apikey:Omit<keys, 'hash'>,
                public_signing_keys:public_signing_keys[],
                user: {
                    id: string | null,
                    username: string | null,
                    updated_at: Date | null,
                    avatar_color: string | null,
                    email: string | null,
                    is_admin: boolean | null
                }
            }[] = []
            try{
                await db.connect()
                returnValue = await db.getKeysForCache(input.cacheID)
                await db.disconnect()
            }
            catch(e){
                Logger.error(`Failed to get keys for cache ${input.cacheID}: ${e}`)
                await db.disconnect()
                await Promise.reject(e)
            }
            return returnValue
        }),
    removeKeyFromCache: protectedProcedure
        .input(z.object({cacheID: z.string(), apiKeyID: z.string()}))
        .mutation(async ({ctx, input}) => {
            Logger.debug(`Removing key ${input.apiKeyID} from cache ${input.cacheID}`)
            const db = new Database()
            try{
                await db.connect()
                await db.removeKeyFromCache(input.apiKeyID, input.cacheID)
            }
            catch(e){
                Logger.error(`Failed to remove key ${input.apiKeyID} from cache ${input.cacheID}: ${e}`)
                await db.disconnect()
                await Promise.reject(e)
            }
            finally{
                await db.disconnect()
            }
        })
});
