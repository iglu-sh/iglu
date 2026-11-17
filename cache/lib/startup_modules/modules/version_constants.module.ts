import type { StartupModule } from "../Module";

export const version_constants: StartupModule<{
    iglu_version_number: string,
    iglu_version_name: string
}> = {
    name: "version_constants.module",
    description: "Checks for updates and logs those to the CLI",
    is_target: false,

    before: [],
    requires: [],
    after: [],

    timeout_ms: 10,
    optional: true,

    enabled: async () => {
        return true;
    },

    start: async ():Promise<{iglu_version_number:string, iglu_version_name:string}> => {
        const package_json = require("../../../package.json")
        const current_version = package_json.version ?? "<unknown_iglu_version>";
        const version_name = package_json.version_name ?? "<unknown_iglu_version_name>";
        return {
            iglu_version_name: version_name,
            iglu_version_number: current_version
        } 
    },

    stop: async () => {},
};
