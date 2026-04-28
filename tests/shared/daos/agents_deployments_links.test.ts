import Logger from "@/logger";
import type { agent_deployment_link_abstract } from "../../../shared/db/DAO/abstracts/agent_deployment_link_abstract";
import type { SupportedDatabasesString } from "../../../shared/db/DAO/DAO";
import { setupDatabase } from "./utils";
import { sqlite_agents_deployments_links } from "../../../shared/db/DAO/sqlite/agents_deployments_links";
import { test } from "bun:test";

/**
* @description Tests the agents_deployments_table and a given DAO
* @param {access_rules_abstract} agents_deployments_dao The dao you want to test
* @param {SupportedDatabasesString | 'Facade'} db_type The type of dao you are testing, this doesn't have an effect beyond test descriptions
* */
export async function test_agents_deployments_table(agents_deployments_dao:agent_deployment_link_abstract, db_type:SupportedDatabasesString|'Facade'){
    const table_name = 'agents_deployments_link'
    test(`${db_type} (DAO, ${table_name}): Expect insert to work normally`, async ()=>{

    })
}


Logger.setLogLevel('WARN')
await setupDatabase('SQLite')
await test_agents_deployments_table(new sqlite_agents_deployments_links(), 'SQLite')
