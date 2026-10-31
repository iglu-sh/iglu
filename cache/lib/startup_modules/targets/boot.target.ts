import type { StartupModule } from "../Module";

export const boot_target: StartupModule<null> = {
    name: "boot.target",
    description: `The initial starting point of the Cache. This unit is always run first`,
    is_target: true,
    optional: false,
    timeout_ms: 0,
    before: ["configuration.module"],
    requires: [],
    after: [],
    async enabled(): Promise<boolean> {
        return true;
    },
    async start(): Promise<null> {
        return null;
    },
    async stop(): Promise<void> {},
};
