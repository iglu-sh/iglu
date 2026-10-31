import type { database_version } from "@iglu-sh/shared";
import type { StartupModule } from "../Module";

export const declarative_version_module: StartupModule<database_version> = {
    name: "declarative-version.module",
    description: "Fetches the latest declarative version",
    is_target: false,

    before: [],
    after: ["database.target"],
    requires: ["database.target"],

    timeout_ms: 100,
    optional: false,

    enabled: async (): Promise<boolean> => {
        return true;
    },

    start: async (): Promise<database_version> => {},
};
