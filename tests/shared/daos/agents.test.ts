import { expect, test } from "bun:test";
import z from "zod";
import type { agent } from "@/db_types";
import Logger from "@/logger";
import type { agent_abstract } from "../../../shared/db/DAO/abstracts/agent_abstract";
import { Agents } from "../../../shared/db/DAO/agents";
import type { SupportedDatabasesString } from "../../../shared/db/DAO/DAO";
import { Deployment_keys } from "../../../shared/db/DAO/deployment_keys";
import { sqlite_agent } from "../../../shared/db/DAO/sqlite/agent";
import { Tenants } from "../../../shared/db/DAO/tenants";
import { hashApiKey } from "../../../shared/utils/crypto/api_key_generation";
import { agent_schema } from "../../../shared/utils/zod/zod_db_schemas";
import { setupDatabase } from "./utils";

/**
 * @description Runs tests for a given agent dao
 * @param {agent_abstract} agent_dao The dao you want to test
 * @param {SupportedDatabasesString | 'Facade'} db_type The type of dao you are testing, this doesn't have an effect beyond test descriptions
 * */
export async function test_agents_table(
    agent_dao: agent_abstract,
    db_type: SupportedDatabasesString | "Facade",
) {
    const table_name = "Agents";
    const tenant_to_use = await new Tenants().insert({
        id: "n/a",
        github_username: "test_user",
        name: Bun.randomUUIDv7(),
        permission: "Read",
        is_public: true,
        preferred_compression_method: "XZ",
        uri: "http://test.example.com/agent_test",
        priority: 1,
        ttl: 1,
    });
    const key_to_use = await new Deployment_keys().insert({
        id: "n/a",
        tenants_id: tenant_to_use,
        type: "agent",
        hash: hashApiKey(Bun.randomUUIDv7()),
        expires_at: 10,
        created_at: 11,
        name: "test agent",
    });

    let agent_to_use: agent | undefined;
    test.serial(`${db_type} (DAO, ${table_name}): Expect insert to work normally`, async () => {
        const agent_inserted = await agent_dao.insert({
            id: "n/a",
            tenants_id: tenant_to_use,
            last_seen: 0,
            version: "1.7",
            os: "aarch64-darwin",
            is_online: true,
            name: "test_agent",
            last_key_used: key_to_use,
        });
        expect(agent_inserted).toBeDefined();
        expect(agent_inserted).not.toBeNull();
        expect(agent_schema.safeParse(agent_inserted).success).toBeTrue();
        expect(agent_inserted.id).not.toBe("n/a");

        agent_to_use = agent_inserted;
    });

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect to get back at least one record from the agent table`,
        async () => {
            const all_agents = await agent_dao.getAll();

            expect(all_agents).toBeDefined();
            expect(Array.isArray(all_agents)).toBeTrue();
            expect(z.array(agent_schema).safeParse(all_agents).success).toBeTrue();
            expect(all_agents.length).toBeGreaterThanOrEqual(1);
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect to get the inserted agent back when quering by id`,
        async () => {
            expect(agent_to_use).toBeDefined();
            agent_to_use = agent_to_use as agent;
            const agent_in_db = await agent_dao.getById(agent_to_use.id);

            expect(agent_in_db).toBeDefined();
            expect(agent_in_db).not.toBeNull();
            expect(agent_schema.safeParse(agent_in_db).success).toBeTrue();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect an edit operation to succeed and return a sane value`,
        async () => {
            expect(agent_to_use).toBeDefined();
            agent_to_use = agent_to_use as agent;

            const updated_agent = await agent_dao.update({
                ...agent_to_use,
                last_seen: 69,
            });
            expect(updated_agent).toBeDefined();
            expect(updated_agent).not.toBeNull();
            expect(agent_schema.safeParse(updated_agent).success).toBeTrue();

            const state_in_db = await agent_dao.getById(agent_to_use.id);
            expect(state_in_db).toBeDefined();
            expect(state_in_db).not.toBeNull();
            expect(agent_schema.safeParse(state_in_db).success).toBeTrue();

            expect(updated_agent.last_seen).toBe(69);
            expect(updated_agent.last_seen).toBe((state_in_db as agent).last_seen);
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect a delete operation to pass without failure`,
        async () => {
            expect(agent_to_use).toBeDefined();
            agent_to_use = agent_to_use as agent;

            await agent_dao.delete(agent_to_use);

            const record_in_db = await agent_dao.getById(agent_to_use.id);

            expect(record_in_db).toBeDefined();
            expect(record_in_db).toBeNull();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect an insert operation that targets a non-existant tenant to fail`,
        async () => {
            expect(key_to_use).toBeDefined();
            expect(tenant_to_use).toBeDefined();

            let insert_did_throw = false;
            try {
                await agent_dao.insert({
                    id: "n/a",
                    tenants_id: {
                        ...tenant_to_use,
                        id: "non-existant-tenant",
                    },
                    last_seen: 0,
                    version: "1.7",
                    os: "aarch64-darwin",
                    is_online: true,
                    name: "test_agent",
                    last_key_used: key_to_use,
                });
            } catch (e) {
                Logger.debug(`Got expected error in agent insert: ${e}`);
                insert_did_throw = true;
            }

            expect(insert_did_throw).toBeTrue();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect an insert operation that targets a non-existant key to fail`,
        async () => {
            expect(key_to_use).toBeDefined();
            expect(tenant_to_use).toBeDefined();

            let insert_did_throw = false;
            try {
                await agent_dao.insert({
                    id: "n/a",
                    tenants_id: tenant_to_use,
                    last_seen: 0,
                    version: "1.7",
                    os: "aarch64-darwin",
                    is_online: true,
                    name: "test_agent",
                    last_key_used: {
                        ...key_to_use,
                        id: "non-existant-key",
                    },
                });
            } catch (e) {
                Logger.debug(`Got expected error in agent insert: ${e}`);
                insert_did_throw = true;
            }

            expect(insert_did_throw).toBeTrue();
        },
    );
}

Logger.setLogLevel("WARN");
await setupDatabase("SQLite");
await test_agents_table(new sqlite_agent(), "SQLite");
await test_agents_table(new Agents(), "Facade");
