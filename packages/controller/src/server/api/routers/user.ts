import { z } from "zod";

import {
    adminProcedure,
    createTRPCRouter,
    protectedProcedure,
} from "@/server/api/trpc";
import { db, User } from "@iglu-sh/common";
import Logger from "@iglu-sh/logger";
import type { apiKeyWithCache, cache_key, keys } from "@/types/db";
import type { user } from "@iglu-sh/types";

export const user = createTRPCRouter({
    mustShowOOB: protectedProcedure
        .input(z.string().uuid())
        .query(async ({ input }): Promise<boolean> => {
            const DB = new db.DynamicDatabase();
            try {
                await DB.connect();
                const user = await new User(DB).getById(input);
                await DB.disconnect();
                if (!user) {
                    return false;
                }
                if (!user.is_admin) {
                    return false;
                }
                return user.show_oob;
            } catch (e) {
                Logger.error(`Failed to check if user must show OOB: ${e}`);
                await DB.disconnect();
                return false;
            }
        }),
    getUser: protectedProcedure.query(async ({ ctx }): Promise<user> => {
        const DB = new db.DynamicDatabase();
        try {
            await DB.connect();
            const user = await new User(DB).getById(ctx.session.user.user.id);
            await DB.disconnect();
            if (!user) {
                throw new Error("User not found");
            }
            return user;
        } catch (e) {
            Logger.error(`Failed to get user: ${e}`);
            await DB.disconnect();
            throw e;
        }
    }),
    getUserWithKeysAndCaches: protectedProcedure.query(
        async ({
            ctx,
        }): Promise<
            Array<{
                user: User;
                caches: cache[];
                apikeys: keys[];
                signingkeys: Array<{
                    public_signing_key: public_signing_keys[];
                    signing_key_cache_api_link: signing_key_cache_api_link[];
                }>;
            }>
        > => {
            const db = new Database();
            let returnVal: Array<{
                user: User;
                caches: cache[];
                apikeys: keys[];
                signingkeys: Array<{
                    public_signing_key: public_signing_keys[];
                    signing_key_cache_api_link: signing_key_cache_api_link[];
                }>;
            }> = [];
            try {
                await db.connect();
                returnVal = await db.getUserWithKeysAndCaches(
                    ctx.session.user.session_user.id,
                );
            } catch (e) {
                // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
                await Promise.reject(
                    `Failed to query Users with Keys and Caches: ${e}`,
                );
            } finally {
                await db.disconnect();
            }
            return returnVal;
        },
    ),
    changePassword: protectedProcedure
        .input(
            z.object({
                oldPassword: z.string(),
                newPassword: z.string(),
                repeatPassword: z.string(),
            }),
        )
        .mutation(async ({ input, ctx }): Promise<boolean> => {
            const DB = new db.DynamicDatabase();
            let success = false;
            console.log(
                "Changing password for user:",
                ctx.session.user.user.id,
            );
            try {
                await DB.connect();
                const userDB = new User(DB);
                let user = await userDB.getById(ctx.session.user.user.id);
                if (!user) {
                    throw new Error("User not found");
                }
                // Authenticate the user with the old password
                const pw_correct = await userDB.verifyPW(
                    input.oldPassword,
                    user.password,
                );
                if (!pw_correct) {
                    throw new Error("Invalid current password");
                }
                if (input.newPassword !== input.repeatPassword) {
                    throw new Error(
                        "New password and repeat password do not match",
                    );
                }
                if (input.newPassword.length < 8) {
                    throw new Error(
                        "New password must be at least 8 characters long",
                    );
                }
                user = {
                    ...user,
                    password: await userDB.hashPW(input.newPassword),
                    must_change_password: false,
                };
                await userDB.modifyEntry(user);
                await DB.disconnect();
                success = true;
            } catch (e) {
                Logger.error(`Failed to reset password for user: ${e}`);
                await DB.disconnect();
                success = false;
            }
            return success;
        }),
    getApiKeys: protectedProcedure.query(
        async ({
            ctx,
        }): Promise<
            {
                key: keys;
                cacheKeyLinks: cache_key[];
                caches: cache[];
                associatedPSKs: public_signing_keys[];
            }[]
        > => {
            const db = new Database();
            try {
                await db.connect();
                let apiKeys: any = await db.getApiKeysByUserId(
                    ctx.session.user.session_user.id,
                );
                // Fetch the associated public signing keys for each API key
                let i = 0;
                for (const apiKey of apiKeys) {
                    const pskLinks = await db.getSigningKeysByApiKeyID(
                        apiKey.key.id,
                    );
                    apiKeys[i].associatedPSKs = pskLinks;
                    i++;
                }
                await db.disconnect();
                return apiKeys;
            } catch (e) {
                Logger.error(`Failed to get API keys for user: ${e}`);
                await db.disconnect();
                throw e;
            }
        },
    ),
    getAll: adminProcedure.query(async (): Promise<User[]> => {
        const db = new Database();
        try {
            await db.connect();
            const users = await db.getAllUsers();
            await db.disconnect();
            return users;
        } catch (e) {
            Logger.error(`Failed to get all users: ${e}`);
            await db.disconnect();
            throw e;
        }
    }),
    deleteUser: adminProcedure
        .input(z.object({ userID: z.string().uuid() }))
        .mutation(async ({ input }) => {
            const db = new Database();
            let success = true;
            try {
                await db.connect();
                await db.deleteUserByID(input.userID);
            } catch (e) {
                Logger.error(`Failed to delete user: ${e}`);
                success = false;
            } finally {
                await db.disconnect();
            }
            return success;
        }),
    modifyUserApiKeyLink: adminProcedure
        .input(
            z.object({
                keyID: z.string(),
                action: z.enum(["delete", "removeFromUser"]),
                userID: z.string().uuid(),
            }),
        )
        .mutation(async ({ input }) => {}),
});
