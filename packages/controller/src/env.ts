import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";
import Logger from '@iglu-sh/logger'

Logger.debug('Initialized Logger')
export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    POSTGRES_USER: z.string(),
    POSTGRES_PASSWORD: z.string(),
    POSTGRES_HOST: z.string(),
    POSTGRES_PORT: z.string().optional().default("5432"),
    POSTGRES_DB: z.string().default("cache"),
    LOG_LEVEL: z.enum(["DEBUG", "INFO", "WARNING", "ERROR"]).optional(),
    LOGGER_USE_ENV: z.enum(["true", "false"]).optional().default("true"),
    LOGGER_JSON: z.enum(["true", "false"]).optional().default("false"),
    LOGGER_PREFIX: z.string().optional().default('Controller'),
    LOGGER_PREFIX_COLOR: z
      .enum(["RED", "GREEN", "YELLOW", "BLUE", "MAGENTA", "CYAN", "WHITE"])
      .optional()
      .default("MAGENTA"),
    AUTH_TRUST_HOST: z.enum(["true", "false"]).optional().default("false"),
    DISABLE_BUILDER: z.enum(["true", "false"]).optional().default("false"),
    REDIS_HOST: z.string(),
    REDIS_USER: z.string().optional().default("default"),
    REDIS_PASSWORD: z.string().optional().default("default"),
    REDIS_PORT: z.string().optional().default("6379"),
    NODE_PSK: z.string(),
    AUTH_URL: z.string()
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
    NEXT_PUBLIC_CACHE_URL: z.string(),
    NEXT_PUBLIC_DISABLE_BUILDER: z.enum(["true", "false"]),
    NEXT_PUBLIC_VERSION: z.string().optional().default("0.0.1alpha-dev")
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    POSTGRES_USER: process.env.POSTGRES_USER,
    POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,
    POSTGRES_HOST: process.env.POSTGRES_HOST,
    POSTGRES_PORT: process.env.POSTGRES_PORT ?? "5432",
    POSTGRES_DB: process.env.POSTGRES_DB ?? "cache",
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_USER: process.env.REDIS_USER ?? "default",
    REDIS_PASSWORD: process.env.REDIS_PASSWORD ?? "",
    REDIS_PORT: process.env.REDIS_PORT ?? "6379",
    LOG_LEVEL: process.env.LOG_LEVEL ?? "INFO",
    LOGGER_USE_ENV: process.env.LOGGER_USE_ENV ?? "true",
    LOGGER_JSON: process.env.LOGGER_JSON ?? "false",
    LOGGER_PREFIX: process.env.LOGGER_PREFIX ?? "Controller",
    LOGGER_PREFIX_COLOR: process.env.LOGGER_PREFIX_COLOR ?? "MAGENTA",
    // NEXT_PUBLIC_CLIENTVAR: process.env.NEXT_PUBLIC_CLIENTVAR,
    NEXT_PUBLIC_CACHE_URL: process.env.NEXT_PUBLIC_CACHE_URL,
    AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST,
    DISABLE_BUILDER: process.env.DISABLE_BUILDER === "true" ? "true" : "false",
    NEXT_PUBLIC_DISABLE_BUILDER: process.env.DISABLE_BUILDER === "true" ? "true" : "false",
    NODE_PSK: process.env.NODE_PSK,
    NEXT_PUBLIC_VERSION: process.env.NEXT_PUBLIC_VERSION,
    AUTH_URL: process.env.NEXT_PUBLIC_URL
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
