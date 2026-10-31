import type { StartupModule } from "../Module";

export const declarative_target: StartupModule<null> = {
    name: "declarative.target",
    description: `Runs after all declarative **planning** jobs are done`,
    is_target: true,
    optional: false,
    timeout_ms: 0,
    before: [],
    requires: ["declarative-version.module", "database.target", "declarative-api-keys.module"],
    after: ["declarative-version.module", "database.target", "declarative-api-keys.module"],
    async enabled(): Promise<boolean> {
        return true;
    },
    async start(): Promise<null> {
        return null;
    },
    async stop(): Promise<void> {},
};
