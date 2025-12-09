import {
    adminProcedure,
    createTRPCRouter,
} from "@/server/api/trpc";
import type {User, uuid, xTheEverythingType, public_signing_keys, keys,signing_key_cache_api_link, cache, builder } from "@iglu-sh/types/core/db";

import Database from "@/lib/db";
import Logger from "@iglu-sh/logger";
import {z} from "zod";
import {env} from "@/env";

export const admin = createTRPCRouter({
    // Returns a list of all caches with everything attached to them via joins
    getCachesPropagated: adminProcedure
        .query(async ():Promise<xTheEverythingType[]>=>{
            const db = new Database()
            let data:xTheEverythingType[] = []
            try{
                await db.connect()
                data = await db.getEverything();
            }
            catch(e){
                
                Logger.error(`Failed to connect to DB ${e}`);
            }
            return data;
        }),
    addUser: adminProcedure
        .input(z.object({
            name: z.string().min(1),
            email: z.string().email(),
            isAdmin: z.boolean().default(false)
        }))
        .mutation(async ({ input}):Promise<{
            user: User,
            success: boolean
        }> => {
            const db = new Database()
            const password = Math.random().toString(36).slice(-8); // Generate a random password
            let user:User = {
                id: '' as uuid,
                username: input.name,
                email: input.email,
                is_admin: input.isAdmin,
                avatar_color: '#000000', // Default color, can be changed later
                createdAt: new Date(),
                updatedAt: new Date(),
                last_login: new Date(),
                is_verified: false,
                must_change_password: false,
                show_oob: false,
                password: password
            };
            let success = false
            try{
                await db.connect()
                // Check if the user already exists
                const existingUser = await db.getUserByNameOrEmail(input.name, input.email);
                if(existingUser){
                    throw new Error(`User with name ${input.name} or email ${input.email} already exists.`);
                }
                user = await db.createUser(
                    input.name,
                    input.email,
                    password,
                    input.isAdmin,
                    true,
                    true,
                    false
                )
                user.password = password
                success = true;
            }
            catch(e){
                
                Logger.error(`Failed to add user ${e}`);
            }
            await db.disconnect()
            return {
                user: user,
                success: success
            }
        }),
    changeAccess: adminProcedure
        .input(z.object({
            userId: z.string().uuid(),
            type: z.enum(["add", "remove"]),
            resourceType: z.enum(["cache", "apikey"]),
            resourceId: z.number()
        }))
        .mutation(async ({ input}):Promise<{
            success: boolean,
            message?: string
        }> => {
            const db = new Database()
            let success = false;
            try{
                await db.connect()
                if(input.resourceType === "cache"){
                    if(input.type === "add"){
                        // Add user to the cache
                        success = await db.addUserToCache(input.resourceId, input.userId)
                    }
                }
                if(input.resourceType === "apikey"){
                    if(input.type === "add"){
                        // Add user to the API key
                        success = await db.addUserToApiKey(input.resourceId, input.userId)
                    }
                }
                await db.disconnect()
            }
            catch(e){
                
                Logger.error(`Failed to connect to DB ${e}`);
                return {
                    success: false,
                    message: "Database connection failed."
                }
            }

            return {
                success: success,
            }
        }),
    removeOOBFlag: adminProcedure
        .input(z.string().uuid())
        .mutation(async ({ input }) => {
            const db = new Database()
            let success = false;
            Logger.debug(`Removing OOB flag for user ${input}`);
            try{
                await db.connect()
                success = await db.removeOOBFlag(input);
                await db.disconnect()
            }
            catch(e){
                Logger.error(`Failed to connect to DB ${e}`);
            }
            return {
                success: success,
            }
        }),
    getAllUsers: adminProcedure
        .query(async ({ctx}):Promise<Array<{
                user: User;
                caches: cache[];
                apikeys: keys[];
                signingkeys: Array<{
                    public_signing_key: public_signing_keys[];
                    signing_key_cache_api_link: signing_key_cache_api_link[]
                }>
            }>> => {
            const db = new Database()
            let returnVal:Array<{
                user: User;
                caches: cache[];
                apikeys: keys[];
                signingkeys: Array<{
                    public_signing_key: public_signing_keys[];
                    signing_key_cache_api_link: signing_key_cache_api_link[]
                }>
            }> = []
            try{
                await db.connect()
                returnVal = await db.getAllUsersWithKeysAndCaches();
            }
            catch(e){
                // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
                await Promise.reject(`Failed to query Users: ${e}`);
            }
            finally {
                await db.disconnect()
            }
            return returnVal
        }),
    getBuildersForCaches: adminProcedure
        .query(async ():Promise<Array<{"cache": cache, "builders": builder[] | null}>> =>{
            const db = new Database()
            Logger.debug(`Getting builders for caches in Admin TRPC`);
            let returnVal:Array<{"cache": cache, "builders": builder[] | null}> = []
            try{
                await db.connect()
                returnVal = await db.getAllBuildersPerCaches();
            }
            catch(e){
                Logger.error(`Failed to query Users: ${e}`);
                await Promise.reject(new Error(`Failed to query Users: ${e}`));
            }
            finally {
                await db.disconnect()
            }
            return returnVal
        }),
    getControllerConfig: adminProcedure
        .query(async ():Promise<
            {
                server: Array<{
                    envVar: string,
                    value: unknown,
                    description: string
                }>,
                client: Array<{
                    envVar: string,
                    value: unknown,
                    description: string
                }>
            }> => {
            Logger.debug(`Getting controller config via Admin TRPC`);
            const environment = env;
            return {
                server: [
                    {
                        envVar: "AUTH_SECRET",
                        value: environment.AUTH_SECRET,
                        description: "The next-auth secret used to sign authentication tokens."
                    },
                    {
                        envVar: "NODE_ENV",
                        value: environment.NODE_ENV,
                        description: "The environment the controller is running in (development/production). For you, this should always be 'production'."
                    },
                    {
                        envVar: "POSTGRES_USER",
                        value: environment.POSTGRES_USER,
                        description: "The database user the controller uses to connect to the database."
                    },
                    {
                        envVar: "POSTGRES_PASSWORD",
                        value: environment.POSTGRES_PASSWORD ? "********" : null,
                        description: "The database password the controller uses to connect to the database."
                    },
                    {
                        envVar: "POSTGRES_HOST",
                        value: environment.POSTGRES_HOST,
                        description: "The database host the controller uses to connect to the database."
                    },
                    {
                        envVar: "POSTGRES_PORT",
                        value: environment.POSTGRES_PORT,
                        description: "The database port the controller uses to connect to the database."
                    },
                    {
                        envVar: "POSTGRES_DB",
                        value: environment.POSTGRES_DB,
                        description: "The database name the controller uses to connect to the database. This database must already exist (this is done by the Iglu Cache which you should have deployed before starting the controller)."
                    },
                    {
                        envVar: "LOG_LEVEL",
                        value: environment.LOG_LEVEL,
                        description: "The log level the controller uses. This can be one of 'DEBUG', 'INFO', 'WARN', 'ERROR'."
                    },
                    {
                        envVar: "LOGGER_JSON",
                        value: environment.LOGGER_JSON,
                        description: "Whether the logger should log in JSON format. This is useful for logging in production environments."
                    },
                    {
                        envVar: "LOGGER_PREFIX",
                        value: environment.LOGGER_PREFIX,
                        description: "A prefix to add to all log messages."
                    },
                    {
                        envVar: "LOGGER_PREFIX_COLOR",
                        value: environment.LOGGER_PREFIX_COLOR,
                        description: "The color of the prefix to add to all log messages."
                    },
                    {
                        envVar: "AUTH_TRUST_HOST",
                        value: environment.AUTH_TRUST_HOST,
                        description: "Whether to trust the host header for authentication. This should be set to true if you are running the controller behind a reverse proxy."
                    },
                    {
                        envVar: "DISABLE_BUILDER",
                        value: environment.DISABLE_BUILDER,
                        description: "Whether to disable the builder functionality in the controller. Disabling the builders will also disable the need for a redis instance, so choose wisely."
                    },
                    {
                        envVar: "NODE_PSK",
                        value: environment.NODE_PSK ? "********" : null,
                        description: "The pre-shared key used for node-to-controller communication. A node is any Iglu Scheduler Instance which can spin up builders. This key must be the same on all schedulers and the controller."
                    },
                    {
                        envVar: "REDIS_HOST",
                        value: environment.REDIS_HOST,
                        description: "The hostname or IP address of the Redis server used for caching and communication between the controller and schedulers/builders."
                    },
                    {
                        envVar: "REDIS_USER",
                        value: environment.REDIS_USER,
                        description: "The username to use when connecting to the Redis server. Leave empty if authentication is not required or if only password authentication is used."
                    },
                    {
                        envVar: "REDIS_PASSWORD",
                        value: environment.REDIS_PASSWORD ? "********" : null,
                        description: "The password to use when connecting to the Redis server. Leave empty if no authentication is configured."
                    },
                    {
                        envVar: "REDIS_PORT",
                        value: environment.REDIS_PORT,
                        description: "The port number of the Redis server. Default is 6379 if not specified."
                    }
                ],
                client: [
                    {
                        envVar: "NEXT_PUBLIC_CONTROLLER_URL",
                        value: environment.NEXT_PUBLIC_CACHE_URL,
                        description: "The URL of the Iglu Cache you are connecting to."
                    },
                    {
                        envVar: "NEXT_PUBLIC_DISABLE_BUILDER",
                        value: environment.NEXT_PUBLIC_DISABLE_BUILDER,
                        description: "Whether to disable the builder functionality in the controller client. Disabling the builders will hide all builder-related functionality in the UI."
                    },
                    {
                        envVar: "NEXT_PUBLIC_VERSION",
                        value: environment.NEXT_PUBLIC_VERSION,
                        description: "The current version of the Iglu Controller. You won't have to set this, this is done at release time automatically."
                    }
                ]
            }
        }),
    removePublicSigningKey: adminProcedure
        .input(z.object({publicSigningKeyId: z.string()}))
        .mutation(async ({input}) => {
            Logger.debug(`Removing public signing key with ID ${input.publicSigningKeyId} via Admin TRPC`);
            const db = new Database()
            try{
                await db.connect()
                await db.removePublicSigningKey(input.publicSigningKeyId)
            }
            catch(e){
                Logger.error(`Failed to remove public signing key: ${e}`);
                await db.disconnect()
                await Promise.reject(new Error(`Failed to remove public signing key: ${e}`));
            }
            finally{
                await db.disconnect()
            }
        })
});
