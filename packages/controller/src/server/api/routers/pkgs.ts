import { createTRPCRouter, protectedProcedure } from "../trpc";
import Logger from "@iglu-sh/logger";
import type { pkgsInfo } from "@iglu-sh/types";
import z from "zod";
import Database from "@/lib/db";

export const pkgs = createTRPCRouter({
    getPkgsForCache: protectedProcedure
        .input(z.object({ cacheId: z.string() }))
        .query(async ({ ctx, input }): Promise<Array<pkgsInfo>> => {
            //TODO: Re-Implement
            return [];
        }),
});
