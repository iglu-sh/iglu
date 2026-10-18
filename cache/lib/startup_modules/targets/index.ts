import type { StartupModule } from "../Module";
import { boot_target } from "./boot.target";
import { database_target } from "./database.target";

// All targets bundled together in a convenient way for the coordinator
export const targets: readonly StartupModule<unknown>[] = [boot_target, database_target];
