import type { StartupModule } from "../Module";
import { Logger } from "@iglu-sh/shared/logger";
import { Filesystem } from "@/shared/files";

export const filesystem_cleanup: StartupModule<void> = {
    name: "filesystem_cleanup.module",
    description: "Checks for updates and logs those to the CLI",
    is_target: false,

    before: [],
    requires: ["logger.module", "declarative_execution.module", "filesystem.module"],
    after: ["logger.module", "declarative_execution.module", "filesystem.module"],

    timeout_ms: 1000,
    optional: false,

    enabled: async () => {
        return true;
    },

    start: async ():Promise<void> => {
        Logger.debug(`Running orphan derivation cleanup`)
        await new Filesystem().clean();
    },

    stop: async () => {},
};
