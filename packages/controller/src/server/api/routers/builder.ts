/*
 * FIXME: Every route in this file does not validate if the user has access to the builder and cache they are trying to access.
 * */

import {
    adminProcedure,
    createTRPCRouter,
    protectedProcedure,
} from "@/server/api/trpc";
import type {
    user,
    builder as builderType,
    valid_build_states,
} from "@iglu-sh/types/core/db";
import Database from "@/lib/db";
import Logger from "@iglu-sh/logger";
import Redis from "@/lib/redis";
import { z } from "zod";
import { builderSchema } from "@/types/schemas";
import generateCachixKey from "@/lib/generateCachixKey";
import type {
    NodeInfo,
    nodeRegistrationRequest,
} from "@iglu-sh/types/scheduler";
import type { arch } from "@iglu-sh/types/controller";
import { on } from "node:events";
import type { full_builder } from "@iglu-sh/types/core/combined";
import { db } from "@iglu-sh/common";

export const builder = createTRPCRouter({
    // Returns a list of all caches with everything attached to them via joins
    createBuilder: protectedProcedure
        .input(builderSchema)
        .mutation(async ({ ctx, input }): Promise<full_builder> => {
            const db = new Database();
            let createdBuilder: full_builder;
            try {
                await db.connect();
                // Check if user is allowed to access the specified cache
                const cachesForUser = await db.getCachesByUserId(
                    ctx.session.user.session_user.id,
                );

                if (
                    !cachesForUser.some(
                        (cache) => cache.id === input.builder.cache_id,
                    )
                ) {
                    throw new Error(
                        `User ${ctx.session.user.session_user.username} is not allowed to access cache with ID ${input.builder.cache_id}`,
                    );
                }
                // Create a new public-private key
                const keyPair = await generateCachixKey();

                // Create an api key to use
                const plaintextKey = crypto.randomUUID();
                const apiKey = await db.appendApiKey(
                    input.builder.cache_id,
                    plaintextKey,
                    `__[IGLU_BULDER] Builder Key for builder ${input.builder.name}`,
                );

                // Append the signing key to cachix
                const signingKey = await db.appendPublicKey(
                    input.builder.cache_id,
                    keyPair.public,
                    plaintextKey,
                    false,
                    `__[IGLU_BUILDER] Signing Key for builder ${input.builder.name}`,
                );

                // Add everything to the input object
                input.cachix_config.signingkey = keyPair.private;
                input.cachix_config.apikey = plaintextKey;

                // Generate a webhook url
                input.builder.webhookurl = `/api/v1/webhooks/builder/${crypto.randomUUID()}${crypto.randomUUID()}`;

                createdBuilder = await db
                    .createBuilder(
                        input as unknown as combinedBuilder,
                        signingKey!,
                        apiKey,
                    )
                    .then(async (builder) => {
                        // Add the builder to redis
                        const redis = new Redis();
                        await redis
                            .refreshBuilders()
                            .catch(async (err: Error) => {
                                Logger.error(
                                    `Failed to refresh builders in Redis: ${err.message}`,
                                );
                            });
                        await redis.quit();
                        return builder;
                    });
            } catch (e) {
                Logger.error(`Failed to connect to DB ${e}`);
                return Promise.reject(e as Error);
            }
            return Promise.resolve(createdBuilder);
        }),
    updateBuilder: protectedProcedure
        .input(builderSchema)
        .mutation(async ({ ctx, input }): Promise<combinedBuilder> => {
            const db = new Database();
            // Should be typesafe
            const newState: combinedBuilder =
                input as unknown as combinedBuilder;
            let dbState: combinedBuilder | null;
            try {
                // TODO: Only update the fields that are able to be change
                // e.g. don't allow changing cache_id, id, all of the cachix settings, etc.
                await db.connect();
                // Get the current state of the builder
                dbState = await db.getBuilderById(newState.builder.id);
                if (!dbState) {
                    throw new Error(
                        `Builder with ID ${newState.builder.id} not found`,
                    );
                }
                // Map the new state onto the db state

                // Update builder general information
                dbState.builder.name = newState.builder.name;
                dbState.builder.description = newState.builder.description;
                dbState.builder.arch = newState.builder.arch;
                dbState.builder.enabled = newState.builder.enabled;
                dbState.builder.trigger = newState.builder.trigger;
                dbState.builder.cron = newState.builder.cron;

                // Update git options
                dbState.git_config.repository = newState.git_config.repository;
                dbState.git_config.branch = newState.git_config.branch;
                dbState.git_config.requiresauth =
                    newState.git_config.requiresauth;
                dbState.git_config.gitusername =
                    newState.git_config.gitusername;
                dbState.git_config.gitkey = newState.git_config.gitkey;

                // Update build options
                // We only support the command option at the moment anyways so...
                dbState.build_options.command = newState.build_options.command;

                // Update the database
                await db.updateBuilder(dbState);
            } catch (e) {
                await db.disconnect();
                Logger.error(`Failed to connect to DB ${e}`);
                return Promise.reject(e as Error);
            } finally {
                await db.disconnect();
            }
            return dbState!;
        }),
    deleteBuilder: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }): Promise<void> => {
            const db = new Database();
            try {
                await db.connect();
                // Delete the builder
                await db.deleteBuilder(input.id);
            } catch (e) {
                return Promise.reject(e as Error);
            } finally {
                await db.disconnect();
            }
            return Promise.resolve();
        }),
    getAllBuilders: protectedProcedure
        .input(z.object({ cache: z.number() }))
        .query(async ({ ctx, input }): Promise<builderType[]> => {
            console.log("Input:", input);
            const db = new Database();
            Logger.debug("Checking if user is allowed to access cache");
            // TODO: Validate if the user is allowed to access the cache

            Logger.debug("Fetching Builders");
            let builders: builderType[];
            try {
                await db.connect();
                builders = await db.getBuilderForCache(input.cache);
                await db.disconnect();
            } catch (e) {
                Logger.error(`Failed to connect to DB ${e}`);
                await db.disconnect();
                return [];
            }
            return builders;
        }),
    getRegisteredNodes: adminProcedure.query(
        async ({ ctx }): Promise<NodeInfo[]> => {
            const redis = new Redis();
            try {
                const nodes = await redis.getConnectedNodes();
                await redis.quit();
                return nodes;
            } catch (e) {
                Logger.error(`Failed to get nodes from Redis: ${e}`);
                await redis.quit();
            }
            return [];
        },
    ),
    getRegisteredNodesLite: protectedProcedure.query(
        async ({ ctx }): Promise<{ arch: arch; name: string }[]> => {
            const redis = new Redis();
            try {
                const nodes = await redis.getConnectedNodes();
                await redis.quit();
                return nodes.map((node) => ({
                    arch: node.node_arch as arch,
                    name: node.node_name,
                }));
            } catch (e) {
                Logger.error(`Failed to get nodes from Redis: ${e}`);
                await redis.quit();
            }
            return [];
        },
    ),
    getBuilderById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ ctx, input }): Promise<combinedBuilder | null> => {
            const db = new Database();
            let builder: combinedBuilder | null = null;
            try {
                await db.connect();
                const builderConfig = await db.getBuilderById(input.id);
                if (!builderConfig) {
                    throw new Error(`Builder with ID ${input.id} not found`);
                }
                builder = builderConfig;
                await db.disconnect();
            } catch (e) {
                Logger.error(`Failed to get Builder from DB: ${e}`);
                await db.disconnect();
                return Promise.reject(e as Error);
            }
            return builder;
        }),
    getRunsForBuilder: protectedProcedure
        .input(z.object({ id: z.number(), limit: z.number().optional() }))
        .query(
            async ({
                ctx,
                input,
            }): Promise<{
                runDetails: dbQueueEntry[];
                totalRuns: number;
                runStates: Record<valid_build_states, number>;
            }> => {
                const db = new Database();
                let builders: dbQueueEntry[] = [];
                let totalRuns = 0;
                let runStates: Record<valid_build_states, number> = {
                    created: 0,
                    claimed: 0,
                    starting: 0,
                    running: 0,
                    success: 0,
                    failed: 0,
                    canceled: 0,
                };
                try {
                    await db.connect();
                    let builder = await db.getBuilderById(input.id);
                    if (!builder) {
                        throw new Error(
                            `Builder with ID ${input.id} not found`,
                        );
                    }
                    let completeQueue = await db.getAllRunsForCache(
                        builder.builder.cache_id,
                    );
                    for (const queueEntry of completeQueue) {
                        if (
                            queueEntry.builder_run.run.builder_id === input.id
                        ) {
                            totalRuns += 1;
                            runStates[queueEntry.builder_run.run.status] += 1;
                            if (input.limit && builders.length >= input.limit) {
                                continue;
                            }
                            builders.push(queueEntry);
                        }
                    }
                    await db.disconnect();
                } catch (e) {
                    Logger.error(`Failed to connect to DB ${e}`);
                    await db.disconnect();
                    return {
                        runDetails: [],
                        totalRuns: 0,
                        runStates: runStates,
                    };
                }
                return {
                    runDetails: builders,
                    totalRuns: totalRuns,
                    runStates: runStates,
                };
            },
        ),
    getQueue: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ ctx, input }): Promise<dbQueueEntry[]> => {
            const db = new Database();
            let builders: dbQueueEntry[] = [];
            try {
                await db.connect();
                builders = await db.getQueueForCache(input.id);
                await db.disconnect();
            } catch (e) {
                Logger.error(`Failed to connect to DB ${e}`);
                await db.disconnect();
                return [];
            }
            return builders;
        }),
    sendTestJob: adminProcedure
        .input(z.object({ builderID: z.number() }))
        .mutation(async ({ ctx, input }): Promise<boolean> => {
            const db = new Database();
            let builder: combinedBuilder;
            try {
                await db.connect();
                const builderConfig = await db.getBuilderById(input.builderID);
                if (!builderConfig) {
                    throw new Error(
                        `Builder with ID ${input.builderID} not found`,
                    );
                }
                builder = builderConfig;
                await db.disconnect();
            } catch (e) {
                Logger.error(`Failed to connect to DB ${e}`);
                await db.disconnect();
                return Promise.reject(e as Error);
            }
            return !!builder;
        }),
    cancelJob: protectedProcedure
        .input(z.object({ jobID: z.number() }))
        .mutation(async ({ ctx, input }): Promise<boolean> => {
            // Create the redis object
            let redis: Redis;
            try {
                redis = new Redis();
                await redis.stopJob("canceled", input.jobID.toString());
                await redis.quit();
            } catch (e) {
                // @ts-ignore reason: redis is not undefined here and even if it wasn't, we're guarding against it
                if (redis) {
                    await redis.quit();
                }
                Logger.error(`Error canceling job with id ${input.jobID}`);
                Logger.debug(`${e}`);
                return false;
            }
            return true;
        }),
    getRunDetails: protectedProcedure
        .input(z.object({ runID: z.string() }))
        .query(async ({ ctx, input }): Promise<dbQueueEntry> => {
            const db = new Database();
            let runDetails: dbQueueEntry[] = [];
            try {
                await db.connect();
                runDetails = await db.getJobDetails(parseInt(input.runID));
                await db.disconnect();
                if (
                    !runDetails ||
                    runDetails.length === 0 ||
                    runDetails.length > 1
                ) {
                    throw new Error(
                        `Run with ID ${input.runID} not found or has multiple entries`,
                    );
                }
            } catch (e) {
                Logger.error(`Failed to connect to DB ${e}`);
                await db.disconnect();
                throw new Error(`Run with ID ${input.runID} not found`);
            }
            console.log(runDetails[0]);
            return runDetails[0] as dbQueueEntry;
        }),
    getLog: protectedProcedure
        .input(z.object({ cacheID: z.number(), jobID: z.number() }))
        .subscription(async function* (opts): AsyncGenerator<
            builder_runs,
            void,
            unknown
        > {
            console.log("Connected to Subscription for logs:", opts.input);
            // Create Redis client
            const redisClient = new Redis();
            try {
                // Subscribe to the log channel for the specific jobID and cacheID
                const ee = await redisClient.subscribeToJob(opts.input.jobID);
                for await (const [data] of on(ee, "message", {
                    signal: opts.signal,
                })) {
                    // Yield the log data to the subscriber
                    const run = data as builder_runs;
                    console.log("Log data received:", run);
                    yield run;
                }
            } finally {
                Logger.debug("Unsubscribing from log channel");
                await redisClient.quit();
            }
        }),
});
