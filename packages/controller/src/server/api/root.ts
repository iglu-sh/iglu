import { postRouter } from "@/server/api/routers/post";
import { cache } from "@/server/api/routers/cache";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import {admin} from "@/server/api/routers/admin";
import {user} from "@/server/api/routers/user";
import {builder} from "@/server/api/routers/builder";
import { pkgs } from "@/server/api/routers/pkgs";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  cache: cache,
  admin: admin,
  user: user,
  builder: builder,
  pkgs: pkgs 
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
