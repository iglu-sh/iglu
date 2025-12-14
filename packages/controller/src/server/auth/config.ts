import { type DefaultSession, type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import Logger from "@iglu-sh/logger";
import type { user, session_user } from "@iglu-sh/types";
import { db, User } from "@iglu-sh/common";
import type { DefaultJWT, JWT } from "@auth/core/jwt";
import type { Awaitable } from "@auth/core/types";
export interface CustomJWT extends JWT {
    user?: session_user;
}
/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
    interface Session extends DefaultSession {
        user: session_user & DefaultSession["user"];
    }
    interface JWT extends DefaultJWT {
        user?: session_user;
    }
    // interface User {
    //   // ...other properties
    //   // role: UserRole;
    // }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
    providers: [
        CredentialsProvider({
            // The name to display on the sign in form (e.g. "Sign in with...")
            name: "using credentials",
            // `credentials` is used to generate a form on the sign in page.
            // You can specify which fields should be submitted, by adding keys to the `credentials` object.
            // e.g. domain, username, password, 2FA token, etc.
            // You can pass any HTML attribute to the <input> tag through the object.
            credentials: {
                username: {
                    label: "Username",
                    type: "text",
                    placeholder: "jsmith",
                },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials): Promise<session_user | null> {
                // Add logic here to look up the user from the credentials supplied
                if (!credentials?.username || !credentials?.password) {
                    return null;
                }
                if (
                    typeof credentials.password !== "string" ||
                    typeof credentials.username !== "string"
                ) {
                    return null;
                }
                let user: session_user | null = null;
                let pw_correct: boolean = false;
                try {
                    const userDB = await new User(
                        db.StaticDatabase,
                    ).getByUsername(credentials.password);
                    user = {
                        id: userDB.id,
                        username: userDB.username,
                        email: userDB.email,
                        avatar: `/api/v1/user/avatar/${userDB.id}`,
                        createdat: userDB.createdat,
                        updatedat: userDB.updatedat,
                        is_admin: userDB.is_admin,
                        last_login: userDB.last_login,
                        is_verified: userDB.is_verified,
                        must_change_password: userDB.must_change_password,
                        show_oob: userDB.show_oob,
                        avatar_color: userDB.avatar_color,
                    };
                    pw_correct = await new User(db.StaticDatabase).verifyPW(
                        credentials.password,
                        userDB.password,
                    );
                } catch (e) {
                    Logger.error(`Error authenticating user ${e}`);
                }

                // If a user is returned, it means the credentials are valid and the user is authenticated.
                if (!user || !pw_correct) {
                    // Any object returned will be saved in `user` property of the JWT
                    return null;
                }
                return user;
            },
        }),
        /**
         * ...add more providers here.
         *
         * Most other providers require a bit more work than the Discord provider. For example, the
         * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
         * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
         *
         * @see https://next-auth.js.org/providers/github
         */
    ],
    callbacks: {
        session: ({ session, token }) => {
            if (!token?.user) {
                Logger.error(
                    "Session callback called without valid token or user_db",
                );
                return session;
            }
            return {
                ...session,
                user: {
                    ...token,
                    password: undefined, // Just do not send the password hash back to the client
                },
            };
        },
        jwt: ({ token, user }): CustomJWT => {
            if (user) {
                token.user = user;
            }
            return token;
        },
    },
    pages: {
        signIn: "/auth/signin",
        signOut: "/auth/signout",
    },
} satisfies NextAuthConfig;
