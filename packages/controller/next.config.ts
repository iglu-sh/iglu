/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "@/env.ts";
import path from "node:path";
import { db, Setup } from "@iglu-sh/common";
import Logger from "@iglu-sh/logger";

/** @type {import("next").NextConfig} */
/*
*
    const dbStatic = new db.StaticDatabase();
    await dbStatic.connect().then(async () => {
        await new Setup(db.StaticDatabase).createDatabase();
    });
* */
const config = {
    allowedDevOrigins: [
        "local-origin.dev",
        "*.local-origin.dev",
        "10.0.0.72",
        "*",
    ],
    compress: false,

    //////////////////////////////////////////////////////////////////////////
    // TODO: THIS HAS TO BE REMOVED IN THE NEAR FEATURE (TODAY: 27.11.2025) //
    eslint: {
        //
        ignoreDuringBuilds: true, //
    }, //
    typescript: {
        //
        ignoreBuildErrors: true, //
    }, //
    //////////////////////////////////////////////////////////////////////////
};

// Skip DB setup if building
if (
    process.env.SKIP_ENV_VALIDATION &&
    process.env.SKIP_ENV_VALIDATION !== "true"
) {
    Logger.debug("Connecting to static database...");
    (async () => {
        const dbDynamic = new db.DynamicDatabase();
        await dbDynamic.connect().then(async () => {
            Logger.debug("Connected to static database.");
            Logger.info("Creating Database");
            await new Setup(dbDynamic).createDatabase();
        });
    })();
}
export default config;
