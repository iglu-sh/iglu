import type {
    declarative_versioned_api_key,
    declarative_versioned_deployment_key,
    declarative_versioned_keypair,
    declarative_versioned_public_key,
    declarative_versioned_tenant,
    database_version
} from "@iglu-sh/shared";
import {uniqueNamesGenerator, adjectives, colors, animals} from "unique-names-generator"
import SQLiteConnector from "@iglu-sh/shared/db/Connectors/SQLite";
import type { config } from "@iglu-sh/shared/utils/cache";
import type { StartupModule } from "../Module";
import type { planning_type } from "../Planning";
import { tenant_execution } from "../../declarative_execution/tenant";
import { api_key_execution } from "../../declarative_execution/api_key";
import { signing_key_execution } from "../../declarative_execution/signing_key";
import { keypair_execution } from "../../declarative_execution/keypair";
import { deployment_key_execution } from "../../declarative_execution/deployment_key";
import { Database_Versions } from "@iglu-sh/shared/db/DAO/database_versions";
import PostgresConnector from "@iglu-sh/shared/db/Connectors/Postgres";
import type { PgExecutor, SQLiteExecutor } from "@iglu-sh/shared/db/DAO/DAO";

export const declarative_execution: StartupModule<void> = {
    name: "declarative_execution.module",
    description: "Executes the declarative planning results",
    is_target: false,

    before: [],
    after: [
        "database.target",
        "declarative.target",
        "configuration.module",
        "sqlite_migrations.module",
        "postgres_migrations.module",
        "version_constants.module",
    ],
    requires: [
        "database.target",
        "declarative.target",
        "declarative-version.module",
        "configuration.module",
    ],

    timeout_ms: 100,
    optional: false,

    enabled: async (ctx): Promise<boolean> => {
        const config = ctx.get("configuration.module") as config;

        // Only enable this module if reconcile is even enabled
        if (config.config.reconcile.mode === "off") {
            return false;
        }

        return true;
    },

    start: async (ctx): Promise<void> => {
        const config = ctx.get("configuration.module") as config;
        const latest_version = ctx.get("declarative-version.module") as database_version;
        let iglu_version = ctx.get("version_constants.module") as {
            iglu_version_number: string,
            iglu_version_name: string
        } | null

        if(!iglu_version){
            iglu_version = {
                iglu_version_number: "<unknown_iglu_version>",
                iglu_version_name: "<unknown_iglu_version_name>"
            }
        }
        const planned_tenants = ctx.get(
            "declarative-tenant.module",
        ) as planning_type<declarative_versioned_tenant>;
        const planned_api_keys = ctx.get(
            "declarative-api-keys.module",
        ) as planning_type<declarative_versioned_api_key>;
        const planned_deployment_keys = ctx.get(
            "declarative-deployment-key.module",
        ) as planning_type<declarative_versioned_deployment_key>;
        const planned_keypairs = ctx.get(
            "declarative-keypair.module",
        ) as planning_type<declarative_versioned_keypair>;
        const plannend_signing_keys = ctx.get(
            "declarative-signing-keys.module",
        ) as planning_type<declarative_versioned_public_key>;

        let db:SQLiteExecutor|PgExecutor; 

        if(config.database.database_type === "postgres"){
            db = new PostgresConnector().getDB();
        }
        else{
            db = new SQLiteConnector().getDB();
        }

        if(!db){
            throw new Error(`Unable to reliably determine SQL executor`)
        }

        await db.transaction(async (tx) => {

            const tenant_state = await tenant_execution(tx, planned_tenants, config);
            const api_key_state = await api_key_execution(tx, planned_api_keys, config, tenant_state);
            const signing_key_state = await signing_key_execution(tx, plannend_signing_keys, config, api_key_state);
            const keypair_state = await keypair_execution(tx, planned_keypairs, config, tenant_state);
            const deployment_key_state = await deployment_key_execution(tx, planned_deployment_keys, config, tenant_state)

            // At last, we create the new database version
            const new_version:database_version = {
                id: latest_version.id + 1,
                state: {
                    tenants: tenant_state.flatMap((x)=>x.declarative),
                    api_keys: api_key_state.flatMap((x)=>x.declarative),
                    public_keys: signing_key_state.flatMap((x)=>x.declarative),
                    keypairs: keypair_state.flatMap((x)=>x.declarative),
                    deployment_keys: deployment_key_state.flatMap((x)=>x.declarative)
                },
                meta: {
                    previous_generation_id: latest_version.id,
                    rebuild_date: Date.now(),
                    name: `[iglu_${iglu_version.iglu_version_number}_${iglu_version.iglu_version_name}] ${uniqueNamesGenerator({dictionaries:[adjectives,colors,animals]})}` 
                }
            }
            await new Database_Versions(tx).insert(new_version)
        });
    },

    stop: async (): Promise<void> => {},
};
