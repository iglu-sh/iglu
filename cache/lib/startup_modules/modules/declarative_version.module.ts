import type { database_version } from "@iglu-sh/shared";
import { Database_Versions } from "@/shared/db/DAO/database_versions";
import type { StartupModule } from "../Module";

export const declarative_version_module: StartupModule<database_version> = {
    name: "declarative-version.module",
    description: "Fetches the latest declarative version",
    is_target: false,

    before: [],
    after: ["database.target"],
    requires: ["database.target"],

    timeout_ms: 100,
    optional: false,

    enabled: async (): Promise<boolean> => {
        return true;
    },

    start: async (): Promise<database_version> => {
        const latest_version = await new Database_Versions().get_latest();

        if (latest_version === null) {
            return {
                meta: {
                    previous_generation_id: -1,
                    rebuild_date: 0,
                    name: "None yet",
                },
                state: {
                    tenants: [],
                    api_keys: [],
                    public_keys: [],
                    deployment_keys: [],
                    keypairs: [],
                },
                id: -1,
            };
        }

        return latest_version;
    },

    stop: async (): Promise<void> => {},
};
