import { delete_orphan_derivations } from "@iglu-sh/shared/db";
import { Logger } from "@iglu-sh/shared/logger";
import type { StartupModule } from "../Module";

export const orphan_derivation_cleanup: StartupModule<void> = {
    name: "orphan_derivation_cleanup.module",
    description: "Deletes orphaned derivations from the database and filesystem",
    is_target: false,

    before: [],
    requires: [
        "logger.module",
        "declarative_execution.module",
        "filesystem.module",
        "filesystem_cleanup.module",
    ],
    after: [
        "logger.module",
        "declarative_execution.module",
        "filesystem.module",
        "filesystem_cleanup.module",
    ],

    timeout_ms: 1000,
    optional: false,

    enabled: async () => {
        return true;
    },

    start: async (): Promise<void> => {
        Logger.debug(`Running orphan derivation cleanup`);
        await delete_orphan_derivations();
    },

    stop: async () => {},
};
