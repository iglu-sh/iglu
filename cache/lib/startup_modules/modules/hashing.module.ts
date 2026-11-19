import { Logger } from "@iglu-sh/shared/logger";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import type { StartupModule } from "../Module";
import type { env } from "./environment.module";
import z from "zod";

export const hashing: StartupModule<string> = {
    name: "hashing.module",
    description: "Initializes the filesystem",
    is_target: false,

    before: ["configuration.module"],
    requires: ["boot.target", "environment.module"],
    after: ["boot.target", "environment.module"],

    timeout_ms: 1000,
    optional: false,

    enabled: async () => {
        return true;
    },

    start: async (ctx):Promise<string> => {
        const environment: env = ctx.get("environment.module")

        if(
            environment.IGLU_HASHING_SECRET_FILE === null && 
            environment.IGLU_HASHING_SECRET === null
        ){
            Logger.error(
                `Unable to setup Iglu: No IGLU_HASHING_SECRET_FILE or IGLU_HASHING_SECRET is set. Set one of these environmnet variables.`
            )
            throw new Error(
                `Unable to setup Iglu: No IGLU_HASHING_SECRET_FILE or IGLU_HASHING_SECRET is set. Set one of these environmnet variables.`
            )
        }

        if (
            environment.IGLU_HASHING_SECRET_FILE !== null &&
            environment.IGLU_HASHING_SECRET !== null
        ) {
            Logger.error(
                `Unable to setup Iglu: Both IGLU_HASHING_SECRET_FILE and IGLU_HASHING_SECRET is set. Set only one of these environment variables`,
            );
            throw new Error(
                `Unable to setup Iglu: Both IGLU_HASHING_SECRET_FILE and IGLU_HASHING_SECRET is set. Set only one of these environment variables`,
            );
        }

        let hashing_secret = environment.IGLU_HASHING_SECRET;

        if(environment.IGLU_HASHING_SECRET_FILE){
            const file = Bun.file(resolve(environment.IGLU_HASHING_SECRET_FILE))
            if(await file.exists()){
                hashing_secret = await file.text() 
            }
            else{
                const new_key = randomBytes(48);
                await file.write(new_key.toBase64());
                hashing_secret = new_key.toBase64();
            }
        }

        const parsed_hashing_secret = z.string().safeParse(hashing_secret)

        if(!parsed_hashing_secret.success){
            Logger.error(`You did not provide a String for the hashing secret`)
            throw new Error(`You did not provide a String for the hashing secret`)
        }

        return parsed_hashing_secret.data
    },

    stop: async () => {},
};
