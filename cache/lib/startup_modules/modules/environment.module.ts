import { isAbsolute, resolve } from "node:path";
import type { StartupModule } from "../Module";

export type env = {
    IGLU_CACHE_CONF: string | null;
    IGLU_CACHE_RAW_CONF: string | null;
    IGLU_CACHE_CONFIGURATION_PATH: string;
};

export const environment: StartupModule<env> = {
    name: "environment.module",
    description:
        "Parses any environment variables and makes them easily readable and type-safe for the other modules",

    is_target: false,

    before: [],
    requires: ["boot.target"],
    after: ["boot.target"],

    timeout_ms: 1000,

    optional: false,

    enabled: async () => {
        return true;
    },

    start: async (): Promise<env> => {
        let path = resolve(`${process.env.IGLU_CWD}/config.toml`);
        if (process.env.IGLU_CACHE_CONF) {
            if (!isAbsolute(process.env.IGLU_CACHE_CONF)) {
                path = `${process.env.IGLU_CWD}/${process.env.IGLU_CACHE_CONF}`;
            }
        }
        return {
            IGLU_CACHE_CONF: process.env.IGLU_CACHE_CONF ?? null,
            IGLU_CACHE_RAW_CONF: process.env.IGLU_CACHE_RAW_CONF ?? null,
            IGLU_CACHE_CONFIGURATION_PATH: path,
        };
    },

    stop: async (): Promise<void> => {},
};
