import type { StartupModule } from "../Module";
import { configuration } from "./configuration.module";
import { environment } from "./environment.module";
export const modules: readonly StartupModule<unknown>[] = [configuration, environment];
