import type { StartupModule } from "../Module";

export const database_target: StartupModule<void> = {
    name: "database.target",
    description: `A target that means that the database has started up correctly and has all migrations applied`,
    is_target: true,

    before: [],
    requires: ["configuration.module", "environment.module"],
    after: ["configuration.module", "environment.module"],

    timeout_ms: 0,
    optional: false,

    enabled: async () => {
        return true;
    },

    start: async () => {},

    stop: async () => {},
};
