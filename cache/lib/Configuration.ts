import type { config } from "./load_config";

export default class Configuration {
    private static config: config;
    constructor(init_config: config) {
        Configuration.config = init_config;
    }

    public static getConfig(): config {
        return Configuration.config;
    }
}
