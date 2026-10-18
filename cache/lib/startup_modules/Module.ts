export interface StartupContext {
    readonly signal: AbortSignal; // an abort signal to stop the work inside the work() function

    /**
     * @description May be used to read another modules output, for example the output of the configuration
     * @param {string} module_name The name of the module you want to get the output for
     * */
    get<T>(module_name: string): T;
}

export interface StartupModule<T = unknown> {
    readonly name: string;
    readonly description: string;

    // Wether or not this module is to be interpreted as a `target` for other modules. For example boot.target is the first module to be run on every startup.
    // Setting this to true causes the start and stop function to be skipped and the output of this module to be set to `null`
    readonly is_target: boolean;

    /**
     * This section of variables is all about ordering: When a Module is started and what it requires when starting up.
     * The rules are as follows:
     * - `before` and `after` are purely about ordering, i.e where in the queue the module is placed. Both of these say nothing about wether or not a module has to succeed for this module to be loaded. If you `require` another module to be loaded before your module can bestarted, use enter it in `after` and in the `requires` array
     * - `requires` is a list of modules your module CANNOT run without, this lists hard dependencies and your module may be skipped (if it is optional) or failed if any of your dependencies didn't make it
     * */
    readonly before: Array<string>;
    readonly requires: Array<string>;
    readonly after: Array<string>;

    readonly timeout_ms: number;

    // Optional modules do not crash the entire programm if they fail. They do cause a warning on failure but no uncaught exception
    // An optional module will be skipped if any of it's dependencies fail
    readonly optional: boolean;

    /**
     * @description Wether or not this module is enabled. You can use the startup context provided to determine if the module should be run or skipped
     * @param {StartupContext} ctx Current Startup Context
     * @returns {boolean}
     * */
    enabled(ctx: StartupContext): Promise<boolean>;

    /**
     * @description The work that needs to be done by this module
     * @param {StartupContext} ctx Current Startup Context
     * @returns {Promise<T>}
     * */
    start(ctx: StartupContext): Promise<T>;

    /**
     * @description All modules have their stop function run in reverse on A SIGTERM or other Shutdown request
     * @param {StartupContext} ctx Current Startup Context
     * @returns {Promise<void>}
     * */
    stop(ctx: StartupContext): Promise<void>;
}
