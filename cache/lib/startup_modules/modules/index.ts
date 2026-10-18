import type { StartupModule } from "../Module";
import { configuration } from "./configuration.module";
import { environment } from "./environment.module";
import { logger_module } from "./logger.module";
export const modules: readonly StartupModule<unknown>[] = [
    configuration,
    environment,
    logger_module,
];
