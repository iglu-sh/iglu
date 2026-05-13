import { expect, test } from "bun:test";
import z from "zod";
import type { agents_deployments_link } from "@/db_types";
import Logger from "@/logger";
import type { agent_deployment_link_abstract } from "../../../shared/db/DAO/abstracts/agent_deployment_link_abstract";
import { Agents } from "../../../shared/db/DAO/agents";
import { Agents_deployments_links } from "../../../shared/db/DAO/agents_deployments_links";
import type { SupportedDatabasesString } from "../../../shared/db/DAO/DAO";
import { Deployments } from "../../../shared/db/DAO/deployment";
import { Deployment_keys } from "../../../shared/db/DAO/deployment_keys";
import { sqlite_agents_deployments_links } from "../../../shared/db/DAO/sqlite/agents_deployments_links";
import { Tenants } from "../../../shared/db/DAO/tenants";
import { hashApiKey } from "../../../shared/utils/crypto/api_key_generation";
import { agents_deployments_link_schema } from "../../../shared/utils/zod/zod_db_schemas";

/**
 * @description Tests the agents_deployments_table and a given agents_deployments dao
 * @param {access_rules_abstract} agents_deployments_dao The dao you want to test
 * @param {SupportedDatabasesString | 'Facade'} db_type The type of dao you are testing, this doesn't have an effect beyond test descriptions
 * */
export async function test_agents_deployments_table(
    agents_deployments_dao: agent_deployment_link_abstract,
    db_type: SupportedDatabasesString | "Facade",
) {
    const table_name = "agents_deployments_link";

    const associated_tenant = await new Tenants().insert({
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

    const associated_deployment_key = await new Deployment_keys().insert({
        id: "n/a",
        tenants_id: associated_tenant,
        type: "agent",
        hash: hashApiKey(Bun.randomUUIDv7()),
        expires_at: 10,
        created_at: 11,
        name: "test agent",
    });
    const associated_agent = await new Agents().insert({
        id: "n/a",
        tenants_id: associated_tenant,
        last_seen: 0,
        version: "1.7",
        os: "aarch64-darwin",
        is_online: true,
        name: Bun.randomUUIDv7(),
        last_key_used: associated_deployment_key,
    });
    const associated_deployment = await new Deployments().insert({
        id: "n/a",
        tenants_id: associated_tenant,
        created_at: 0,
        start_time: 0,
        end_time: 0,
        status: "Pending",
        deploy_json: "{}",
        deployment_index: 0,
        key_used: await new Deployment_keys().insert({
            id: "n/a",
            tenants_id: associated_tenant,
            type: "activate",
            hash: hashApiKey(Bun.randomUUIDv7()),
            expires_at: 10,
            created_at: 11,
            name: "Test activation",
        }),
    });

    let created_agent_deployment_link: agents_deployments_link | undefined;

    test.serial(`${db_type} (DAO, ${table_name}): Expect insert to work normally`, async () => {
        const inserted_agent_deployment_link = await agents_deployments_dao.insert({
            id: "n/a",
            deployments_id: associated_deployment,
            agents_id: associated_agent,
            log: null,
            started_at: 0,
            finished_at: null,
            store_path: "/nix/store/volanta",
            closure_size: null,
            status: "Succeeded",
        });

        expect(inserted_agent_deployment_link).toBeDefined();
        expect(inserted_agent_deployment_link).not.toBeNull();
        expect(inserted_agent_deployment_link.id).not.toBe("n/a");
        expect(
            agents_deployments_link_schema.safeParse(inserted_agent_deployment_link).success,
        ).toBeTrue();
        created_agent_deployment_link = inserted_agent_deployment_link;
    });

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect a get by ID to work normally and adhere to zod schema`,
        async () => {
            expect(created_agent_deployment_link).toBeDefined();
            created_agent_deployment_link =
                created_agent_deployment_link as agents_deployments_link;

            const db_value = await agents_deployments_dao.getById(created_agent_deployment_link.id);

            expect(db_value).toBeDefined();
            expect(db_value).not.toBeNull();
            expect(agents_deployments_link_schema.safeParse(db_value).success).toBeTrue();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect to get at least one record when calling getAll()`,
        async () => {
            expect(created_agent_deployment_link).toBeDefined();

            const all_records = await agents_deployments_dao.getAll();

            expect(all_records).toBeDefined();
            expect(all_records).not.toBeNull();
            expect(Array.isArray(all_records)).toBeTrue();
            expect(all_records.length).toBeGreaterThanOrEqual(1);
            expect(
                z.array(agents_deployments_link_schema).safeParse(all_records).success,
            ).toBeTrue();
        },
    );

    test.serial(`${db_type} (DAO, ${table_name}): Expect an edit call to work`, async () => {
        expect(created_agent_deployment_link).toBeDefined();
        created_agent_deployment_link = created_agent_deployment_link as agents_deployments_link;

        const link_from_update = await agents_deployments_dao.update({
            ...created_agent_deployment_link,
            log: "[Yeah buddy]",
            started_at: 20,
        });

        expect(link_from_update).toBeDefined();
        expect(link_from_update).not.toBeNull();
        expect(agents_deployments_link_schema.safeParse(link_from_update).success).toBeTrue();

        let updated_link_in_db = await agents_deployments_dao.getById(
            created_agent_deployment_link.id,
        );

        expect(updated_link_in_db).toBeDefined();
        expect(updated_link_in_db).not.toBeNull();
        expect(agents_deployments_link_schema.safeParse(updated_link_in_db).success).toBeTrue();

        updated_link_in_db = updated_link_in_db as agents_deployments_link;

        expect(updated_link_in_db.log).toBe("[Yeah buddy]");
        expect(updated_link_in_db.started_at).toBe(20);
        expect(link_from_update.log).toBe(updated_link_in_db.log);
        expect(link_from_update.started_at).toBe(updated_link_in_db.started_at);
    });

    test.serial(`${db_type} (DAO, ${table_name}): Expect a delete call to work`, async () => {
        expect(created_agent_deployment_link).toBeDefined();
        created_agent_deployment_link = created_agent_deployment_link as agents_deployments_link;

        await agents_deployments_dao.delete(created_agent_deployment_link);

        const link_just_deleted = await agents_deployments_dao.getById(
            created_agent_deployment_link.id,
        );

        expect(link_just_deleted).toBeDefined();
        expect(link_just_deleted).toBeNull();
    });

    /**
     * Foreign key behaviour tests
     * */
    test.serial(
        `${db_type} (DAO, ${table_name}): Expect a deployment_agent link to be deleted, if the associated deployment is deleted`,
        async () => {
            const deployment_key_inserted = await new Deployment_keys().insert({
                id: "n/a",
                tenants_id: associated_tenant,
                type: "agent",
                hash: hashApiKey(Bun.randomUUIDv7()),
                expires_at: 10,
                created_at: 11,
                name: "test agent",
            });
            const agent_inserted = await new Agents().insert({
                id: "n/a",
                tenants_id: associated_tenant,
                last_seen: 0,
                version: "1.7",
                os: "aarch64-darwin",
                is_online: true,
                name: Bun.randomUUIDv7(),
                last_key_used: deployment_key_inserted,
            });
            const deployment_inserted = await new Deployments().insert({
                id: "n/a",
                tenants_id: associated_tenant,
                created_at: 0,
                start_time: 0,
                end_time: 0,
                status: "Pending",
                deploy_json: "{}",
                deployment_index: 0,
                key_used: await new Deployment_keys().insert({
                    id: "n/a",
                    tenants_id: associated_tenant,
                    type: "activate",
                    hash: hashApiKey(Bun.randomUUIDv7()),
                    expires_at: 10,
                    created_at: 11,
                    name: "Test activation",
                }),
            });

            const subject = await agents_deployments_dao.insert({
                id: "n/a",
                deployments_id: deployment_inserted,
                agents_id: agent_inserted,
                log: null,
                started_at: 0,
                finished_at: null,
                store_path: "/nix/store/solaar",
                closure_size: null,
                status: "InProgress",
            });

            await new Deployments().delete(deployment_inserted);

            const result_for_subject = await agents_deployments_dao.getById(subject.id);

            expect(result_for_subject).toBeDefined();
            expect(result_for_subject).toBeNull();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect a deployment_agent link to be deleted, if the associated agent is deleted`,
        async () => {
            const deployment_key_inserted = await new Deployment_keys().insert({
                id: "n/a",
                tenants_id: associated_tenant,
                type: "agent",
                hash: hashApiKey(Bun.randomUUIDv7()),
                expires_at: 10,
                created_at: 11,
                name: "test agent",
            });
            const agent_inserted = await new Agents().insert({
                id: "n/a",
                tenants_id: associated_tenant,
                last_seen: 0,
                version: "1.7",
                os: "aarch64-darwin",
                is_online: true,
                name: Bun.randomUUIDv7(),
                last_key_used: deployment_key_inserted,
            });
            const deployment_inserted = await new Deployments().insert({
                id: "n/a",
                tenants_id: associated_tenant,
                created_at: 0,
                start_time: 0,
                end_time: 0,
                status: "Pending",
                deploy_json: "{}",
                deployment_index: 0,
                key_used: await new Deployment_keys().insert({
                    id: "n/a",
                    tenants_id: associated_tenant,
                    type: "activate",
                    hash: hashApiKey(Bun.randomUUIDv7()),
                    expires_at: 10,
                    created_at: 11,
                    name: "Test activation",
                }),
            });

            const subject = await agents_deployments_dao.insert({
                id: "n/a",
                deployments_id: deployment_inserted,
                agents_id: agent_inserted,
                log: null,
                started_at: 0,
                finished_at: null,
                store_path: "/nix/store/solaar",
                closure_size: null,
                status: "Failed",
            });

            await new Agents().delete(agent_inserted);

            const result_for_subject = await agents_deployments_dao.getById(subject.id);

            expect(result_for_subject).toBeDefined();
            expect(result_for_subject).toBeNull();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect a tenant to also delete all deployments associated with it`,
        async () => {
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
            const deployment_key_inserted = await new Deployment_keys().insert({
                id: "n/a",
                tenants_id: tenant_to_use,
                type: "agent",
                hash: hashApiKey(Bun.randomUUIDv7()),
                expires_at: 10,
                created_at: 11,
                name: "test agent",
            });
            const agent_inserted = await new Agents().insert({
                id: "n/a",
                tenants_id: tenant_to_use,
                last_seen: 0,
                version: "1.7",
                os: "aarch64-darwin",
                is_online: true,
                name: Bun.randomUUIDv7(),
                last_key_used: deployment_key_inserted,
            });
            const deployment_inserted = await new Deployments().insert({
                id: "n/a",
                tenants_id: tenant_to_use,
                created_at: 0,
                start_time: 0,
                end_time: 0,
                status: "Pending",
                deploy_json: "{}",
                deployment_index: 0,
                key_used: await new Deployment_keys().insert({
                    id: "n/a",
                    tenants_id: tenant_to_use,
                    type: "activate",
                    hash: hashApiKey(Bun.randomUUIDv7()),
                    expires_at: 10,
                    created_at: 11,
                    name: "Test activation",
                }),
            });

            const subject = await agents_deployments_dao.insert({
                id: "n/a",
                deployments_id: deployment_inserted,
                agents_id: agent_inserted,
                log: null,
                started_at: 0,
                finished_at: null,
                store_path: "/nix/store/solaar",
                closure_size: null,
                status: "Succeeded",
            });

            await new Tenants().delete(tenant_to_use);

            const subject_should_be_deleted = await agents_deployments_dao.getById(subject.id);

            expect(subject_should_be_deleted).toBeDefined();
            expect(subject_should_be_deleted).toBeNull();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect an insert referring to a non-existen agent to fail`,
        async () => {
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
            const deployment_key_inserted = await new Deployment_keys().insert({
                id: "n/a",
                tenants_id: tenant_to_use,
                type: "agent",
                hash: hashApiKey(Bun.randomUUIDv7()),
                expires_at: 10,
                created_at: 11,
                name: "test agent",
            });
            const deployment_inserted = await new Deployments().insert({
                id: "n/a",
                tenants_id: tenant_to_use,
                created_at: 0,
                start_time: 0,
                end_time: 0,
                status: "Pending",
                deploy_json: "{}",
                deployment_index: 0,
                key_used: await new Deployment_keys().insert({
                    id: "n/a",
                    tenants_id: tenant_to_use,
                    type: "activate",
                    hash: hashApiKey(Bun.randomUUIDv7()),
                    expires_at: 10,
                    created_at: 11,
                    name: "Test activation",
                }),
            });
            let insert_did_throw = false;

            try {
                await agents_deployments_dao.insert({
                    id: "n/a",
                    deployments_id: deployment_inserted,
                    agents_id: {
                        id: "n/a",
                        tenants_id: associated_tenant,
                        last_seen: 0,
                        version: "1.7",
                        os: "aarch64-darwin",
                        is_online: true,
                        name: Bun.randomUUIDv7(),
                        last_key_used: deployment_key_inserted,
                    },
                    log: null,
                    started_at: 0,
                    finished_at: null,
                    store_path: "/nix/store/volanta",
                    closure_size: null,
                    status: "Succeeded",
                });
            } catch (e) {
                Logger.debug(`Received an expected error for insert: ${e}`);
                insert_did_throw = true;
            }

            expect(insert_did_throw).toBeTrue();
        },
    );

    test(`${db_type} (DAO, ${table_name}): Expect an insert referring to a non-existent deployment to throw an error`, async () => {
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
        const deployment_key_inserted = await new Deployment_keys().insert({
            id: "n/a",
            tenants_id: tenant_to_use,
            type: "agent",
            hash: hashApiKey(Bun.randomUUIDv7()),
            expires_at: 10,
            created_at: 11,
            name: "test agent",
        });
        const agent_inserted = await new Agents().insert({
            id: "n/a",
            tenants_id: tenant_to_use,
            last_seen: 0,
            version: "1.7",
            os: "aarch64-darwin",
            is_online: true,
            name: Bun.randomUUIDv7(),
            last_key_used: deployment_key_inserted,
        });
        const deployment_inserted = await new Deployments().insert({
            id: "n/a",
            tenants_id: tenant_to_use,
            created_at: 0,
            start_time: 0,
            end_time: 0,
            status: "Pending",
            deploy_json: "{}",
            deployment_index: 0,
            key_used: await new Deployment_keys().insert({
                id: "n/a",
                tenants_id: tenant_to_use,
                type: "activate",
                hash: hashApiKey(Bun.randomUUIDv7()),
                expires_at: 10,
                created_at: 11,
                name: "Test activation",
            }),
        });
        let insert_did_throw = false;

        try {
            await agents_deployments_dao.insert({
                id: "n/a",
                deployments_id: {
                    ...deployment_inserted,
                    id: "n/a",
                },
                agents_id: agent_inserted,
                log: null,
                started_at: 0,
                finished_at: null,
                closure_size: null,
                store_path: "/nix/store/volanta",
                status: "Succeeded",
            });
        } catch (e) {
            Logger.debug(`Received an expected error for insert: ${e}`);
            insert_did_throw = true;
        }
        expect(insert_did_throw).toBeTrue();
    });
}

await test_agents_deployments_table(new sqlite_agents_deployments_links(), "SQLite");
await test_agents_deployments_table(new Agents_deployments_links(), "Facade");
