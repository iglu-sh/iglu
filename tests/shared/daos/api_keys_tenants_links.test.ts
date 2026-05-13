import { expect, test } from "bun:test";
import z from "zod";
import type { api_key_tenant_link } from "@/db_types";
import Logger from "@/logger";
import type { api_keys_tenants_links_abstract } from "../../../shared/db/DAO/abstracts/api_keys_tenants_links_abstract";
import { Api_keys } from "../../../shared/db/DAO/api_key";
import { Api_keys_tenants_link } from "../../../shared/db/DAO/api_key_tenant_link";
import type { SupportedDatabasesString } from "../../../shared/db/DAO/DAO";
import sqlite_api_key_tenant_link from "../../../shared/db/DAO/sqlite/api_key_tenant_link";
import { Tenants } from "../../../shared/db/DAO/tenants";
import { hashApiKey } from "../../../shared/utils/crypto/api_key_generation";
import { api_keys_tenants_links_schema } from "../../../shared/utils/zod/zod_db_schemas";

/**
 * @description Runs tests for a given api_keys_tenants_links dao
 * @param {api_keys_tenants_links_abstract} link_dao The dao you want to test
 * @param {SupportedDatabasesString | 'Facade'} db_type The type of dao you are testing, this doesn't have an effect beyond test descriptions
 * */
export async function test_api_keys_tenants_links_table(
    link_dao: api_keys_tenants_links_abstract,
    db_type: SupportedDatabasesString | "Facade",
) {
    const table_name = "Api_keys_tenants_links";
    let tenant_to_use = await new Tenants().insert({
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

    const api_key_to_use = await new Api_keys().insert({
        id: "n/a",
        hash: hashApiKey(Bun.randomUUIDv7()),
        name: "Test Api key for link to tenant",
    });

    let link_record: api_key_tenant_link | undefined;
    test.serial(
        `${db_type} (DAO, ${table_name}): Expect insert to work normally and returned value to adhere to schema`,
        async () => {
            const new_link = await link_dao.insert({
                id: "n/a",
                tenants_id: tenant_to_use,
                api_keys_id: api_key_to_use,
            });

            expect(new_link).toBeDefined();
            expect(new_link.id).not.toBe("n/a");
            expect(api_keys_tenants_links_schema.safeParse(new_link).success).toBeTrue();

            const actual_link_from_db = await link_dao.getById(new_link.id);
            expect(actual_link_from_db).toBeDefined();
            expect(actual_link_from_db === null).toBeFalse();
            link_record = new_link;
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect getAll() to work normally and to adhere to schema`,
        async () => {
            const all_links = await link_dao.getAll();

            expect(all_links).toBeDefined();
            expect(all_links.length).toBeGreaterThanOrEqual(1);
            expect(z.array(api_keys_tenants_links_schema).safeParse(all_links).success).toBeTrue();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect getById() to work normally and to adhere to schema`,
        async () => {
            expect(link_record).toBeDefined();
            link_record = link_record as api_key_tenant_link;

            const specified_record = await link_dao.getById(link_record.id);

            expect(specified_record).toBeDefined();
            expect(specified_record === null).toBeFalse();
            expect(api_keys_tenants_links_schema.safeParse(specified_record).success).toBeTrue();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect getByApiKey() to work normally and adhere to schema`,
        async () => {
            expect(link_record).toBeDefined();
            expect(api_key_to_use).toBeDefined();
            expect(tenant_to_use).toBeDefined();
            link_record = link_record as api_key_tenant_link;

            const for_api_key = await link_dao.getByApiKey(api_key_to_use.id);

            expect(for_api_key).toBeDefined();
            expect(for_api_key).not.toBeNull();
            expect(Array.isArray(for_api_key)).toBeTrue();
            expect(for_api_key.length).toBeGreaterThanOrEqual(1);
            expect(
                z.array(api_keys_tenants_links_schema).safeParse(for_api_key).success,
            ).toBeTrue();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect getByTenantAndKey() to work normally and adhere to schema`,
        async () => {
            expect(link_record).toBeDefined();
            expect(api_key_to_use).toBeDefined();
            expect(tenant_to_use).toBeDefined();
            link_record = link_record as api_key_tenant_link;

            const for_tenant = await link_dao.getByTenantAndKey(
                api_key_to_use.id,
                tenant_to_use.id,
            );

            expect(for_tenant).toBeDefined();
            expect(for_tenant).not.toBeNull();
            expect(z.array(api_keys_tenants_links_schema).safeParse(for_tenant).success).toBeTrue();

            const for_tenant_but_nonexisting_key = await link_dao.getByTenantAndKey(
                Bun.randomUUIDv7(),
                tenant_to_use.id,
            );
            expect(for_tenant_but_nonexisting_key).toBeEmpty();
            expect(for_tenant_but_nonexisting_key).not.toBeNull();
            expect(
                z.array(api_keys_tenants_links_schema).safeParse(for_tenant_but_nonexisting_key)
                    .success,
            ).toBeTrue();
        },
    );

    test.serial(`${db_type} (DAO, ${table_name}): Expect update() to update a link`, async () => {
        expect(link_record).toBeDefined();
        expect(api_key_to_use).toBeDefined();
        expect(tenant_to_use).toBeDefined();
        link_record = link_record as api_key_tenant_link;

        const newly_created_api_key = await new Api_keys().insert({
            id: "n/a",
            hash: hashApiKey(Bun.randomUUIDv7()),
            name: "Test Api key for link to tenant",
        });
        const updated = await link_dao.update({
            ...link_record,
            api_keys_id: newly_created_api_key,
        });

        expect(updated).toBeDefined();
        expect(updated.api_keys_id.id).toBe(newly_created_api_key.id);
        expect(updated.tenants_id.id).toBe(tenant_to_use.id);
        expect(updated.id).toBe(link_record.id);

        // change it back and then delete the api key
        const back = await link_dao.update({
            ...link_record,
        });

        expect(back).toBeDefined();
        expect(back.api_keys_id.id).toBe(api_key_to_use.id);
        expect(back.tenants_id.id).toBe(tenant_to_use.id);
        expect(back.id).toBe(link_record.id);
    });

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect delete() to actually delete a link`,
        async () => {
            expect(link_record).toBeDefined();
            link_record = link_record as api_key_tenant_link;

            await link_dao.delete(link_record);

            const nonexistent_link = await link_dao.getById(link_record.id);

            expect(nonexistent_link === null).toBeTrue();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect a deleted tenant to also delete any link records associated`,
        async () => {
            expect(api_key_to_use).toBeDefined();
            expect(tenant_to_use).toBeDefined();

            const newly_created_link = await link_dao.insert({
                id: "n/a",
                tenants_id: tenant_to_use,
                api_keys_id: api_key_to_use,
            });
            expect(newly_created_link).toBeDefined();

            const does_record_exist_in_db = await link_dao.getById(newly_created_link.id);
            expect(does_record_exist_in_db).toBeDefined();
            expect(does_record_exist_in_db).not.toBeNull();
            expect(
                api_keys_tenants_links_schema.safeParse(does_record_exist_in_db).success,
            ).toBeTrue();

            await new Tenants().delete(tenant_to_use);

            const does_record_still_exist = await link_dao.getById(newly_created_link.id);
            expect(does_record_still_exist).toBe(null);
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect a deleted api_key to also delete any link records associated`,
        async () => {
            expect(api_key_to_use).toBeDefined();

            tenant_to_use = await new Tenants().insert({
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

            const newly_created_link = await link_dao.insert({
                id: "n/a",
                tenants_id: tenant_to_use,
                api_keys_id: api_key_to_use,
            });
            expect(newly_created_link).toBeDefined();

            const does_record_exist_in_db = await link_dao.getById(newly_created_link.id);
            expect(does_record_exist_in_db).toBeDefined();
            expect(does_record_exist_in_db).not.toBeNull();
            expect(
                api_keys_tenants_links_schema.safeParse(does_record_exist_in_db).success,
            ).toBeTrue();

            await new Api_keys().delete(api_key_to_use);

            const does_record_still_exist = await link_dao.getById(newly_created_link.id);
            expect(does_record_still_exist).toBeNull();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect an insert referring to a nonexistent tenant to fail`,
        async () => {
            const tenant = await new Tenants().insert({
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

            const api_key = await new Api_keys().insert({
                id: "n/a",
                hash: hashApiKey(Bun.randomUUIDv7()),
                name: "Test Api key for link to tenant",
            });

            let insert_did_throw = false;

            try {
                await link_dao.insert({
                    id: "n/a",
                    tenants_id: {
                        ...tenant,
                        id: "n/a",
                    },
                    api_keys_id: api_key,
                });
            } catch (e) {
                Logger.debug(`Received an expected error while inserting: ${e}`);
                insert_did_throw = true;
            }

            expect(insert_did_throw).toBeTrue();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect an insert referring to a nonexistent api_key to fail`,
        async () => {
            const tenant = await new Tenants().insert({
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

            const api_key = await new Api_keys().insert({
                id: "n/a",
                hash: hashApiKey(Bun.randomUUIDv7()),
                name: "Test Api key for link to tenant",
            });

            let insert_did_throw = false;

            try {
                await link_dao.insert({
                    id: "n/a",
                    tenants_id: tenant,
                    api_keys_id: {
                        ...api_key,
                        id: "n/a",
                    },
                });
            } catch (e) {
                Logger.debug(`Received an expected error while inserting: ${e}`);
                insert_did_throw = true;
            }

            expect(insert_did_throw).toBeTrue();
        },
    );
}

await test_api_keys_tenants_links_table(new sqlite_api_key_tenant_link(), "SQLite");
await test_api_keys_tenants_links_table(new Api_keys_tenants_link(), "Facade");
