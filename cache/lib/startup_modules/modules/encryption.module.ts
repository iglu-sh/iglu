import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { Logger } from "@iglu-sh/shared/logger";
import z from "zod";
import type { StartupModule } from "../Module";
import type { env } from "./environment.module";

export const encryption_module: StartupModule<string> = {
    name: "encryption.module",
    description: "Verifies the encryption secret and passes it to the configuration",

    is_target: false,

    before: ["configuration.module"],
    requires: ["boot.target", "environment.module"],
    after: ["boot.target", "environment.module"],

    timeout_ms: 100,
    optional: false,

    enabled: async (): Promise<boolean> => {
        return true;
    },

    start: async (ctx): Promise<string> => {
        const environment: env = ctx.get("environment.module");

        if (
            environment.IGLU_ENCRYPTION_SECRET_FILE === null &&
            environment.IGLU_ENCRYPTION_SECRET === null
        ) {
            Logger.error(
                `Unable to setup Iglu: No IGLU_ENCRYPTION_SECRET_FILE or IGLU_ENCRYPTION_SECRET is set. Set one of these environment variables`,
            );
            throw new Error(
                `Unable to setup Iglu: No IGLU_ENCRYPTION_SECRET_FILE or IGLU_ENCRYPTION_SECRET is set. Set one of these environment variables`,
            );
        }

        if (
            environment.IGLU_ENCRYPTION_SECRET_FILE !== null &&
            environment.IGLU_ENCRYPTION_SECRET !== null
        ) {
            Logger.error(
                `Unable to setup Iglu: Both IGLU_ENCRYPTION_SECRET_FILE and IGLU_ENCRYPTION_SECRET is set. Set only one of these environment variables`,
            );
            throw new Error(
                `Unable to setup Iglu: Both IGLU_ENCRYPTION_SECRET_FILE and IGLU_ENCRYPTION_SECRET is set. Set only one of these environment variables`,
            );
        }

        let encryption_secret = environment.IGLU_ENCRYPTION_SECRET;

        if (environment.IGLU_ENCRYPTION_SECRET_FILE) {
            const file = Bun.file(resolve(environment.IGLU_ENCRYPTION_SECRET_FILE));
            if (await file.exists()) {
                encryption_secret = await file.text();
            } else {
                const new_key = randomBytes(32);
                await file.write(new_key.toBase64());
                encryption_secret = new_key.toBase64();
            }
        }

        const parsed_encryption_secret = z.base64().safeParse(encryption_secret);
        if (!parsed_encryption_secret.success) {
            Logger.error(`Your encryption secret is not in the base64 format.`);
            throw new Error(`Your encryption secret is not in the base64 format.`);
        }
        const encryption_secret_as_buffer = Buffer.from(parsed_encryption_secret.data);

        if (encryption_secret_as_buffer.length !== 32) {
            Logger.error(
                `The provided encryption secret does not decode to 32 bytes. Please change your key to decode to the expected value, or delete the secrets file entirely (if this is your first installation) and let iglu generate a secret for you.`,
            );
        }

        return parsed_encryption_secret.data;
    },

    async stop() {},
};
