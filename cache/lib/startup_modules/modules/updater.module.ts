import determine_version from "../../determine_version";
import type { StartupModule } from "../Module";

export const updater_module: StartupModule<void> = {
    name: "updater.module",
    description: "Checks for updates and logs those to the CLI",
    is_target: false,

    before: [],
    requires: [],
    after: ["logger.module"],

    timeout_ms: 10,
    optional: true,

    enabled: async () => {
        return true;
    },

    start: async () => {
        await determine_version();
    },

    stop: async () => {},
};
