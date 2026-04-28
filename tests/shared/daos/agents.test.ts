import {test, expect} from 'bun:test'
import { Agents } from '../../../shared/db/DAO/agents'
import { setupDatabase } from './utils'
import type { agent_abstract } from '../../../shared/db/DAO/abstracts/agent_abstract'
import type { agent } from '@/db_types'
import type { SupportedDatabasesString } from '../../../shared/db/DAO/DAO'
import Tenants from '../../../shared/db/DAO/tenants'
import Deployment_keys from '../../../shared/db/DAO/deployment_keys'
import { sqlite_agent } from '../../../shared/db/DAO/sqlite/agent'
import Logger from '@/logger'
import { agent_schema } from '../../../shared/utils/zod/zod_db_schemas'

/**
 * @description Runs tests for a given agent dao
 * @param {agent_abstract} agent_dao The dao you want to test
 * @param {SupportedDatabasesString | 'Facade'} db_type The type of dao you are testing, this doesn't have an effect beyond test descriptions
* */
export async function test_agents_table(agent_dao:agent_abstract, db_type:SupportedDatabasesString | 'Facade'){
    let agent_db: agent | undefined
    const table_name = 'Agents' 
    test.serial(`${db_type} (DAO, ${table_name}): Expect insert to work normally`, async ()=>{
        const tenant_to_use = await new Tenants().insert({
            id: "n/a",
            github_username: "test_user",
            name: Bun.randomUUIDv7(),
            permission: "Read",
            is_public: true,
            preferred_compression_method: 'XZ',
            uri: 'http://test.example.com/agent_test',
            priority: 1,
            ttl: 1
        })
        const key_to_use = await new Deployment_keys().insert({
            id: "n/a",
            tenants_id: tenant_to_use,
            type: "agent",
            hash: "12345",
            expires_at: 10,
            created_at: 11,
            name: "test agent"
        })
        agent_db = await agent_dao.insert({
            id: 'n/a',
            tenants_id: tenant_to_use,
            last_seen: 0,
            version: "1.7",
            os: "aarch64-darwin",
            is_online: true,
            name: "test_agent",
            last_key_used: key_to_use
        }) 
        expect(!!agent_db).toBeTrue()
    })

    test.serial(`${db_type} (DAO, ${table_name}): Expect inserted Agent to adhere to the agent schema`, ()=>{
        expect(agent_schema.safeParse(agent_db).success).toBeTrue()
    })

    test.serial(`${db_type} (DAO, ${table_name}): Expect to get back at least one record from the agent table`, async ()=>{
        const all_agents = await agent_dao.getAll()
        expect(all_agents.length).toBeGreaterThan(0)         
    })

    test.serial(`${db_type} (DAO, ${table_name}): Expect to get the inserted agent back when quering by id`, async()=>{
        expect(agent_db).toBeDefined()
        if(!agent_db){
            throw new Error('Cannot run test: Query by ID in Agent table: I do not have an ID to work with')
        }
        const agent_in_db = await agent_dao.getById(agent_db.id)
        expect(!!agent_in_db).toBeTrue()
    })

    test.serial(`${db_type} (DAO, ${table_name}): Expect an edit operation to succeed and return a sane value`, async ()=>{
        if(!agent_db){
            throw new Error('Cannot run test: Query by ID in Agent table: I do not have an ID to work with')
        }
        const updated_agent = await agent_dao.update({
            ...agent_db,
            last_seen: 69
        })
        expect(updated_agent).toBeDefined()
        expect(updated_agent.last_seen).toBe(69)
    })

    test.serial(`${db_type} (DAO, ${table_name}): Expect a delete operation to pass without failure`, async()=>{
        if(!agent_db){
            throw new Error('Cannot run test: Query by ID in Agent table: I do not have an ID to work with')
        }
        const all_agents = await agent_dao.getAll() 
        await agent_dao.delete(agent_db)
        const all_agents_after_del = await agent_dao.getAll()
        expect(all_agents_after_del.length).toBeLessThan(all_agents.length)
    })
}


Logger.setLogLevel('WARN')
await setupDatabase('SQLite');
await test_agents_table(new sqlite_agent(), "SQLite")
await test_agents_table(new Agents(), "Facade")
