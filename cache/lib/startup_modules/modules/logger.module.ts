import { Logger } from "@iglu-sh/shared/logger";
import type { config } from "@iglu-sh/shared/utils/cache";
import type { StartupContext, StartupModule } from "../Module";

export const logger_module: StartupModule<void> = {
    name: "logger.module",
    description: `Initializes the logger`,
    is_target: false,

    before: [],
    requires: ["configuration.module"],
    after: ["configuration.module", "environment.module"],

    timeout_ms: 10,
    optional: true,

    enabled: async () => {
        return true;
    },

    start: async (ctx: StartupContext): Promise<void> => {
        const config = ctx.get("configuration.module") as config;
        Logger.setPrefix(config.logger.logging_prefix ?? "Cache", "MAGENTA");
        Logger.setJsonLogging(config.logger.logging_format === "json");
        Logger.setLogLevel(
            config.logger.log_level.toUpperCase() as "DEBUG" | "INFO" | "WARN" | "ERROR",
        );
        Logger.setShouldLogRequests(config.logger.should_log_requests);
        Logger.debug(`Logging Module ran successfully!`);
    },

    stop: async (): Promise<void> => {},
};
