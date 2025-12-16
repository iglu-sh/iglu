import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import Logger from "@iglu-sh/logger";
import { Cache_user_link, db, Cache, User } from "@iglu-sh/common";
import DynamicDatabase = db.DynamicDatabase;
import type { cache_user_link, cache } from "@iglu-sh/types";

export const cache = createTRPCRouter({
    byUser: protectedProcedure.query(
        async ({ ctx }): Promise<cache_user_link[]> => {
            if (!ctx.session.user) {
                return [];
            }
            let data: cache_user_link[] = [];
            const DB = new DynamicDatabase();
            const cache_user_linkDB = new Cache_user_link(DB);
            try {
                await DB.connect();
                data = await cache_user_linkDB.getByUser(
                    ctx.session.user.user.id,
                );
            } catch (err) {
                Logger.error(`Failed to connect to DB ${err}`);
            }
            await DB.disconnect();
            return data;
        },
    ),
    createCache: protectedProcedure
        .input(z.custom<cacheCreationObject>())
        .mutation(async ({ ctx, input }) => {
            const db = new Database();
            try {
                await db.connect();
                const cache = await db
                    .createCache(ctx.session.user.id, input)
                    .catch((err) => {
                        Logger.error(`Failed to create cache: ${err}`);
                        throw new Error(
                            JSON.stringify({
                                message: "Failed to create cache",
                                cause: "Already exists",
                            }),
                        );
                    });
                await db.disconnect();
                console.log(cache);
                return cache;
            } catch (err) {
                Logger.error(`Failed to create cache: ${err}`);
                await db.disconnect();
                throw new Error((err as string) || "Failed to create cache");
            }
        }),
    getOverview: protectedProcedure
        .input(z.object({ cacheID: z.string() }))
        .query(
            async ({
                ctx,
                input,
            }): Promise<{
                cache: cache;
                users: cache_user_link[];
                audit_log: unknown[]; //TODO Implement audit logging
                hashes_overview: {
                    count: number;
                    storage_used: number;
                    cache_hit_percentage: number;
                    response_time_average: number;
                };
            }> => {
                const dbDynamic = new db.DynamicDatabase();
                try {
                    await dbDynamic.connect();
                    const cacheObject = await new Cache(dbDynamic).getById(
                        input.cacheID,
                    );
                    const user = await new User(dbDynamic).getById(
                        ctx.session.user.user.id,
                    );
                    const cachesByUser = await new Cache_user_link(
                        dbDynamic,
                    ).getByUser(user.id);
                    if (
                        !cachesByUser.find(
                            (c) => c.cache.id === input.cacheID,
                        ) &&
                        !user?.is_admin
                    ) {
                        throw new Error("You do not have access to this cache");
                    }
                    const usersInThisCache = await new Cache_user_link(
                        dbDynamic,
                    ).getByCache(cacheObject.id);
                    const cacheOverview: {
                        cache: cache;
                        users: cache_user_link[];
                        audit_log: unknown[];
                        hashes_overview: {
                            count: number;
                            storage_used: number;
                            cache_hit_percentage: number;
                            response_time_average: number;
                        };
                    } = {
                        cache: cacheObject,
                        users: usersInThisCache,
                        hashes_overview: {
                            count: 0,
                            storage_used: 0,
                            cache_hit_percentage: 0,
                            response_time_average: 0,
                        },
                        audit_log: [],
                    };
                    await dbDynamic.disconnect();
                    return cacheOverview;
                } catch (err) {
                    Logger.error(`Failed to get cacheOverview: ${err}`);
                    await dbDynamic.disconnect();
                    throw new Error(
                        (err as string) || "Failed to get cacheOverview",
                    );
                }
            },
        ),
    getBuilders: protectedProcedure.query(async ({ ctx, input }) => {}),
    getKeys: protectedProcedure.input(z.object({ cacheID: z.number() })).query(
        async ({
            ctx,
            input,
        }): Promise<
            Array<{
                apikey: keys;
                public_signing_keys: public_signing_keys[];
                user: {
                    id: string;
                    username: string;
                    updated_at: Date;
                    avatar_color: string;
                    email: string;
                    is_admin: boolean;
                };
            }>
        > => {
            const db = new Database();
            let returnValue: {
                apikey: Omit<keys, "hash">;
                public_signing_keys: public_signing_keys[];
                user: {
                    id: string | null;
                    username: string | null;
                    updated_at: Date | null;
                    avatar_color: string | null;
                    email: string | null;
                    is_admin: boolean | null;
                };
            }[] = [];
            try {
                await db.connect();
                returnValue = await db.getKeysForCache(input.cacheID);
                await db.disconnect();
            } catch (e) {
                Logger.error(
                    `Failed to get keys for cache ${input.cacheID}: ${e}`,
                );
                await db.disconnect();
                await Promise.reject(e);
            }
            return returnValue;
        },
    ),
    removeKeyFromCache: protectedProcedure
        .input(z.object({ cacheID: z.string(), apiKeyID: z.string() }))
        .mutation(async ({ ctx, input }) => {
            Logger.debug(
                `Removing key ${input.apiKeyID} from cache ${input.cacheID}`,
            );
            const db = new Database();
            try {
                await db.connect();
                await db.removeKeyFromCache(input.apiKeyID, input.cacheID);
            } catch (e) {
                Logger.error(
                    `Failed to remove key ${input.apiKeyID} from cache ${input.cacheID}: ${e}`,
                );
                await db.disconnect();
                await Promise.reject(e);
            } finally {
                await db.disconnect();
            }
        }),
});
