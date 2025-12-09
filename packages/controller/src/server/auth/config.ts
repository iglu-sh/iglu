import { type DefaultSession, type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials"
import Database from "@/lib/db";
import Logger from "@iglu-sh/logger";
import type {User} from "@/types/db";
import type {DefaultJWT, JWT} from "@auth/core/jwt";
export interface CustomJWT extends JWT{
    user_db?: User;
}
/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
      email: string,
      session_user: Omit<User, "password">
    } & DefaultSession["user"];
  }
  interface JWT extends DefaultJWT {
    user_db: User
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
        username: { label: "Username", type: "text", placeholder: "jsmith" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Add logic here to look up the user from the credentials supplied
        if(!credentials?.username || !credentials?.password) {
          return null
        }
        if(typeof credentials.password !== "string" || typeof credentials.username !== "string") {
          return null
        }
        let user:User | null = null
        const db = new Database()
        try{
          await db.connect()
          user = await db.authenticateUser(credentials.username, credentials.password)
          await db.disconnect()
        }
        catch(e){
            Logger.error(`Error authenticating user ${e}`)
        }

        // If a user is returned, it means the credentials are valid and the user is authenticated.
        if (user) {
          // Any object returned will be saved in `user` property of the JWT
          return user
        } else {
          // If you return null then an error will be displayed advising the user to check their details.
          return null
          // You can also Reject this callback with an Error thus the user will be sent to the error page with the error message as a query parameter
        }
      },
    })
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
    session: ({session, token}) => {

      if(!token?.user_db){
        Logger.error("Session callback called without valid token or user_db")
        return session
      }
      return {
        ...session,
        user: {
          ...session.user,
          id: token.sub,
          session_user: {
            ...token.user_db,
            password: undefined // Just do not send the password hash back to the client
          }
        },
      }
    },
    jwt: ({token, user}):CustomJWT =>{
      if(user){
        token.user_db = user
      }
      return token
    }
    },
    pages: {
        signIn: '/auth/signin',
        signOut: '/auth/signout'
    }
} satisfies NextAuthConfig;
