import type { StartupModule } from "../Module";
import { boot_target } from "./boot.target";

// All targets bundled together in a convenient way for the coordinator
export const targets: readonly StartupModule<unknown>[] = [boot_target];
