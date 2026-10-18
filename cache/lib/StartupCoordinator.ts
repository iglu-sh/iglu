import { Logger } from "@/shared/logger";
import type { StartupContext, StartupModule } from "./startup_modules/Module";
import { modules } from "./startup_modules/modules";
import { targets } from "./startup_modules/targets";

class GraphNode {
    private dependencies: Array<string>;
    private module_definition: StartupModule;

    constructor(module_definition: StartupModule) {
        this.module_definition = module_definition;

        // Merge the `after` and `requries` array into a single dependency array
        this.dependencies = Array.from(
            new Set(module_definition.after.concat(module_definition.requires)),
        );
    }

    /**
     * @description Returns this modules definition
     * @returns {StartupModule}
     * */
    public get_module_definition(): StartupModule {
        return this.module_definition;
    }

    public get_dependencies(): Array<string> {
        return this.dependencies;
    }

    /**
     * @description Appends new entries to this node's dependency array (mainly used for appending entries from other module's `before` key)
     * @param {Array<string>} new_dependencies
     * @returns {void}
     * */
    public append_depencies(new_dependencies: Array<string>): void {
        this.dependencies = Array.from(new Set(this.dependencies.concat(new_dependencies)));
    }

    /**
     * @description Removes a given element from this node's dependencies
     * @param {string} element
     * @returns {void}
     * */
    public remove_dependency(element: string): void {
        if (this.dependencies.includes(element)) {
            const index_of_element = this.dependencies.indexOf(element);
            if (index_of_element < 0) {
                return;
            }
            this.dependencies.splice(index_of_element, 1);
        }
    }
}

export default async function startup() {
    const BOOT_MODULE = "boot.target";

    // Concat both arrays and inject boot.target into the requirements of all modules (if it's not there already) as we want boot.target to always be the first module that runs
    const combined_modules_targets_array = modules.concat(targets);
    const all_registered_module_names = combined_modules_targets_array.map((m) => m.name);

    const module_node_map: { [key: string]: GraphNode } = {};

    // A map of modules to its DEPENDENT modules (for example boot.target would be a key and every other module would be in it's value array)
    const module_dependency_map: { [key: string]: Array<string> } = {};

    // First, we build all of the nodes and store them in the module_node_map
    for (const module of combined_modules_targets_array) {
        if (module_node_map[module.name]) {
            Logger.error(`Module Name ${module.name} exists more than once, aborting start`);
            process.exit(1);
        }
        if (!module.requires.includes(BOOT_MODULE) && module.name !== BOOT_MODULE) {
            module.requires.push(BOOT_MODULE);
        }

        // We need to check if all the dependencies or modules in the `before` key of this module actually exist:
        for (const requirement of Array.from(
            new Set(module.requires.concat(module.after).concat(module.before)),
        )) {
            if (!all_registered_module_names.includes(requirement)) {
                Logger.error(
                    `Module ${requirement} (required/after/before in module: ${module.name}) cannot be found`,
                );
                process.exit(1);
            }
        }

        module_node_map[module.name] = new GraphNode(module);
        module_dependency_map[module.name] = [];
    }

    // Second we need to merge the `before` and the current node dependencies togehter (i.e add a module into the dependency array of other modules if this module is supposed to run before those modules)
    for (const module of Object.keys(module_node_map)) {
        const node = module_node_map[module] as GraphNode;
        const definition = node.get_module_definition();

        for (const before_element of definition.before) {
            const subject_node = module_node_map[before_element] as GraphNode;
            subject_node.append_depencies([module]);

            // We also add this subject's name into this module's dependency list
            if (!(module_dependency_map[module] as Array<string>).includes(before_element)) {
                (module_dependency_map[module] as Array<string>).push(before_element);
            }
        }

        // We also add this module's name into all of the dependencies it has:
        for (const dependency of node.get_dependencies()) {
            if (!(module_dependency_map[dependency] as Array<string>).includes(module)) {
                (module_dependency_map[dependency] as Array<string>).push(module);
            }
        }
    }

    // Now we can actually run Khan's Algorithm:
    // We now run through the module_dependency_map and remove every single element (by putting it in the ordered_array) that does not have any more dependencies
    // The result is an array that is ordered as to our requirements
    const ordered_array: Array<GraphNode> = [];
    let removed_indexes = 0;
    while (Object.keys(module_node_map).length > 0) {
        for (const module of Object.keys(module_node_map)) {
            const node = module_node_map[module] as GraphNode;

            // This means this node has no more dependencies and can be inserted into the ordered array
            if (node.get_dependencies().length === 0) {
                Logger.debug(`Adding module: ${module} into ordered_array`);
                removed_indexes = removed_indexes + 1;
                ordered_array.push(node);
                delete module_node_map[module];

                // Now loop through all modules that had a dependency of this module and remove that from them
                for (const dependent of module_dependency_map[module] as Array<string>) {
                    const node = module_node_map[dependent] as GraphNode;
                    node.remove_dependency(module);
                }
            }
        }
        if (removed_indexes === 0) {
            Logger.error(
                `CYCLIC REDUNDANCY ERROR: Some or all of the remaining modules are dependent on each other in a cyclic way: ${JSON.stringify(Object.keys(module_node_map))} `,
            );
            process.exit(1);
        } else {
            removed_indexes = 0;
        }
    }

    Logger.debug(
        `Startup list: ${JSON.stringify(ordered_array.map((x) => x.get_module_definition().name))}`,
    );

    // Now we actually start the modules in order
    const module_output_map: {
        [key: string]: {
            result: "failed" | "skipped" | "succeeded" | "pending";
            output: unknown;
        };
    } = {};

    for (const module of ordered_array) {
        const module_definition = module.get_module_definition();
        module_output_map[module_definition.name] = {
            result: "pending",
            output: null,
        };

        Logger.info(`Starting module: ${module_definition.name}`);

        let dependency_failed = false;
        let failed_dependency = "";
        // Check if any of this required modules failed
        for (const dependency of module_definition.requires) {
            const dependency_result = module_output_map[dependency];

            if (!dependency_result) {
                Logger.debug(`Module name of failed requirement check: ${module_definition.name}`);
                throw new Error(
                    `BUG: A module tried to request output of a module it either does not rely on or that does not exist as the output of the requested module: ${dependency} does not exst`,
                );
            }

            if (dependency_result.result !== "succeeded") {
                dependency_failed = true;
                failed_dependency = dependency;
                Logger.debug(
                    `Requirement: ${dependency} failed for module: ${module_definition.name}`,
                );
                break;
            }
        }

        if (dependency_failed) {
            (
                module_output_map[module_definition.name] as { result: string; output: unknown }
            ).result = "skipped";
            if (module_definition.optional) {
                Logger.warn(
                    `Skipping optional module: ${module_definition.name} as the dependency: ${failed_dependency} has failed`,
                );
                continue;
            }

            if (!module_definition.optional) {
                Logger.error(
                    `Non-optional Module: ${module_definition.name} cannot start as the dependency: ${failed_dependency} failed`,
                );
                process.exit(1);
            }
        }

        const controller = new AbortController();

        // Signals an abort to the module after a given timeout_ms set by the module
        setTimeout(() => {
            controller.abort();
        }, module_definition.timeout_ms);

        const startup_context: StartupContext = {
            signal: controller.signal,
            get: <T>(module_name: string): T => {
                if (!module_output_map[module_name]) {
                    throw new Error(
                        `BUG: A module tried to request output of a module it either does not rely on or that does not exist as the output of the requested module: ${module_name} does not exst`,
                    );
                }
                return module_output_map[module_name].output as T;
            },
        };

        let module_failed = false;
        try {
            (
                module_output_map[module_definition.name] as { result: string; output: unknown }
            ).output = await module_definition.start(startup_context);
        } catch (err) {
            module_failed = true;
            (
                module_output_map[module_definition.name] as { result: string; output: unknown }
            ).result = "failed";

            if (module_definition.optional) {
                Logger.warn(`Optional module: ${module_definition.name} failed to start.`);
                Logger.debug(`${err}`);
            }

            // Only run if this module is not-optional
            if (!module_definition.optional) {
                Logger.error(
                    `Module: ${module_definition.name} which is a non-optional module failed to start. Iglu will now terminate.`,
                );
                Logger.debug(`${err}`);
                process.exit(1);
            }
        }

        if (!module_failed) {
            (
                module_output_map[module_definition.name] as { result: string; output: unknown }
            ).result = "succeeded";
        }
        Logger.info(`Started module: ${module_definition.name}`);
    }
    Logger.debug(`Startup Complete`);
}
