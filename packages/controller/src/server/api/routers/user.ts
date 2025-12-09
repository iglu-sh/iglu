import { z } from "zod";

import {
    adminProcedure,
    createTRPCRouter,
    protectedProcedure
} from "@/server/api/trpc";
import Database from "@/lib/db";
import Logger from "@iglu-sh/logger";
import type {apiKeyWithCache, cache_key, keys, User} from "@/types/db";
import type {cache, public_signing_keys} from "@iglu-sh/types/core/db";


export const user = createTRPCRouter({
    mustShowOOB: protectedProcedure
        .input(z.string().uuid())
        .query(async ({ input }):Promise<boolean> => {
            const db = new Database();
            try{
                await db.connect();
                const user = await db.getUserById(input);
                await db.disconnect();
                if(!user){
                    return false;
                }
                if(!user.is_admin){
                    return false;
                }
                return user.show_oob
            }
            catch(e){
                Logger.error(`Failed to check if user must show OOB: ${e}`);
                await db.disconnect()
                return false
            }
        }),
    getUser: protectedProcedure
        .query(async ({ ctx }):Promise<User> => {
            const db = new Database();
            try{
                await db.connect();
                const user = await db.getUserById(ctx.session.user.session_user.id);
                await db.disconnect();
                if(!user){
                    throw new Error("User not found");
                }
                return user;
            }
            catch(e){
                Logger.error(`Failed to get user: ${e}`);
                await db.disconnect()
                throw e;
            }
        }),
    getUserWithKeysAndCaches: protectedProcedure
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
                returnVal = await db.getUserWithKeysAndCaches(ctx.session.user.session_user.id);
            }
            catch(e){
                // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
                await Promise.reject(`Failed to query Users with Keys and Caches: ${e}`);
            }
            finally {
                await db.disconnect()
            }
            return returnVal
        }),
    changePassword: protectedProcedure
        .input(z.object({oldPassword: z.string(), newPassword: z.string(), repeatPassword: z.string()}))
        .mutation(async ({ input, ctx }): Promise<boolean>=>{
            const db = new Database()
            let success = false
            try{
                await db.connect()
                const auth = await db.authenticateUser(ctx.session.user.session_user.username, input.oldPassword)
                if(!auth){
                    throw new Error("Invalid current password")
                }
                if(input.newPassword !== input.repeatPassword){
                    throw new Error("New password and repeat password do not match")
                }
                if(input.newPassword.length < 8){
                    throw new Error("New password must be at least 8 characters long")
                }
                success = await db.resetPassword(ctx.session.user.session_user.id, input.newPassword)
                if(!success){
                    throw new Error("Failed to reset password")
                }
            }
            catch(e){
                Logger.error(`Failed to reset password for user: ${e}`);
                success = false
            }
            await db.disconnect()
            return success
        }),
    getApiKeys: protectedProcedure
        .query(async ({ ctx }):Promise<{
            key: keys
            cacheKeyLinks: cache_key[]
            caches: cache[]
            associatedPSKs: public_signing_keys[]
        }[]> => {
            const db = new Database();
            try{
                await db.connect();
                let apiKeys:any = await db.getApiKeysByUserId(ctx.session.user.session_user.id);
                // Fetch the associated public signing keys for each API key
                let i = 0;
                for (const apiKey of apiKeys) {
                    const pskLinks = await db.getSigningKeysByApiKeyID(apiKey.key.id);
                    apiKeys[i].associatedPSKs = pskLinks;
                    i++
                }
                await db.disconnect();
                return apiKeys;
            }
            catch(e){
                Logger.error(`Failed to get API keys for user: ${e}`);
                await db.disconnect();
                throw e;
            }
        }),
    getAll: adminProcedure
        .query(async (): Promise<User[]> => {
            const db = new Database();
            try{
                await db.connect();
                const users = await db.getAllUsers();
                await db.disconnect();
                return users;
            }
            catch(e){
                Logger.error(`Failed to get all users: ${e}`);
                await db.disconnect();
                throw e;
            }
        }),
    deleteUser: adminProcedure
        .input(z.object({userID: z.string().uuid()}))
        .mutation(async ({input})=>{
            const db = new Database();
            let success = true;
            try{
                await db.connect();
                await db.deleteUserByID(input.userID);
            }
            catch(e){
                Logger.error(`Failed to delete user: ${e}`);
                success = false;
            }
            finally {
                await db.disconnect()
            }
            return success;
        }),
    modifyUserApiKeyLink: adminProcedure
        .input(z.object({
                    "keyID": z.string(),
                    "action": z.enum(["delete" , "removeFromUser"]),
                    "userID": z.string().uuid()
            }))
        .mutation(async ({input})=>{

        })
});
