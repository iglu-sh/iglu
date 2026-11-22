import { Filesystem } from "@iglu-sh/shared/files";
import type { StartupModule } from "../Module";

export const filesystem_module: StartupModule<void> = {
    name: "filesystem.module",
    description: "Initializes the filesystem",
    is_target: false,

    before: [],
    requires: ["logger.module", "configuration.module"],
    after: ["logger.module", "configuration.module"],

    timeout_ms: 1000,
    optional: false,

    enabled: async () => {
        return true;
    },

    start: async (): Promise<void> => {
        new Filesystem();
    },

    stop: async () => {},
};
