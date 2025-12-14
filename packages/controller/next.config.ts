/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "@/env.ts";
import { db, Setup } from "@iglu-sh/common";

/** @type {import("next").NextConfig} */
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
    const dbStatic = new db.StaticDatabase();
    await dbStatic.connect().then(async () => {
        await new Setup(db.StaticDatabase).createDatabase();
    });
}
export default config;
