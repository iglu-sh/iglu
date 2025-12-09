import {createTRPCRouter, protectedProcedure} from "../trpc";
import Logger from "@iglu-sh/logger";
import type {pkgsInfo} from "@iglu-sh/types";
import z from "zod";
import Database from "@/lib/db";

export const pkgs = createTRPCRouter({
  getPkgsForCache: protectedProcedure
    .input(z.object({cacheId: z.number()}))
    .query(async ({ctx, input}):Promise<Array<pkgsInfo>>=>{
      const db = new Database()

      Logger.debug("Checking if user is allowed to access cache")
      // TODO: Validate if the user is allowed to access the cache

      let pkgss: pkgsInfo[]
      try{
        await db.connect()
        pkgss = await db.getPkgsForCache(input.cacheId) as pkgsInfo[]
        await db.disconnect()
      }catch(e){
        Logger.error(`Failed to connect to DB ${e}`)
        await db.disconnect
        return []
      }

      return pkgss
    })
})
