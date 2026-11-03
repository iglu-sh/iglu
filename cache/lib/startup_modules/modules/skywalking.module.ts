import type { config } from "@iglu-sh/shared/utils/cache";
import agent from "skywalking-backend-js";
import type { StartupModule } from "../Module";

export const skywalking_setup: StartupModule<void> = {
    name: "skywalking-setup.module",
    description: "Sets up an Apache Skywalking Connection for Observability",
    is_target: false,

    before: [],
    after: ["configuration.module"],
    requires: ["configuration.module"],

    timeout_ms: 1000,
    optional: true,

    enabled: async (ctx): Promise<boolean> => {
        const config = ctx.get("configuration.module") as config;

        return config.server.observability.skywalking.enabled;
    },

    async start(ctx): Promise<void> {
        const config = ctx.get("configuration.module") as config;

        const agent_options = {
            serviceName: config.server.observability.skywalking.service_name,
            serviceInstance: config.server.observability.skywalking.service_instance,
            collectorAddress: config.server.observability.skywalking.collector_address,
            secure: config.server.observability.skywalking.secure,
            authorization: config.server.observability.skywalking.authorization as
                | string
                | undefined,
        };

        if (!config.server.observability.skywalking.authorization) {
            delete agent_options.authorization;
        }

        agent.start(agent_options);
    },

    async stop(): Promise<void> {},
};
