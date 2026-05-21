import { expect, test } from "bun:test";
import z from "zod";
import type { access_rules_abstract } from "../../../shared/db/DAO/abstracts/access_rules_abstract";
import { Access_Rules } from "../../../shared/db/DAO/access_rules";
import type { SupportedDatabasesString } from "../../../shared/db/DAO/DAO";
import sqlite_access_rules from "../../../shared/db/DAO/sqlite/access_rules";
import { Tenants } from "../../../shared/db/DAO/tenants";
import Logger from "../../../shared/logger/Logger";
import type { access_rule } from "../../../shared/types/schema";
import { cidr_to_range } from "../../../shared/utils/ip";
import { access_rule_schema } from "../../../shared/utils/zod/zod_db_schemas";

/**
 * @description Runs tests for a given access_rule dao
 * @param {access_rules_abstract} access_rules_dao The dao you want to test
 * @param {SupportedDatabasesString | 'Facade'} db_type The type of dao you are testing, this doesn't have an effect beyond test descriptions
 * */
async function test_access_rules_table(
    access_rules_dao: access_rules_abstract,
    db_type: SupportedDatabasesString | "Facade",
) {
    let access_rule_db: access_rule | undefined;
    let access_rule_for_update: access_rule | undefined;
    const table_name = "Access_rules";
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

    /******
     * Tests that verify creation in the two ways an access rule can be defined: during tenant creation and standalone creation
     ******* */
    test.serial(
        `${db_type} (DAO, ${table_name}): Expect tenant insert to create at least one access_rule`,
        async () => {
            const access_rules_in_db_for_created_tenant = await access_rules_dao.getByTenant(
                tenant_to_use.id,
            );
            expect(access_rules_in_db_for_created_tenant.length).toBeGreaterThan(0);
            expect(access_rules_in_db_for_created_tenant[0]).toBeDefined();
            expect(access_rules_in_db_for_created_tenant[0]).not.toBeNull();
            expect(access_rules_in_db_for_created_tenant[0]?.action).toBe("accept");
            access_rule_db = access_rules_in_db_for_created_tenant[0];
            expect(access_rule_schema.safeParse(access_rule_db).success).toBeTrue();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}: Expect standalone access_rule insert to work and adhere to zod schem: Expect standalone access_rule insert to work and adhere to zod schema`,
        async () => {
            expect(tenant_to_use).toBeDefined();

            const ip_range = cidr_to_range("224.0.0.0/8");
            const inserted_access_rule = await access_rules_dao.insert({
                id: "n/a",
                tenants_id: tenant_to_use,
                ip_block: "224.0.0.0/8", // Fun fact: This is an unassagined /8 block that goes to 239.0.0.0/8 and you are free to use in your networks
                start_ip: ip_range.range_start,
                end_ip: ip_range.range_end,
                priority: 1,
                action: "drop",
                name: "Test rule",
            });
            expect(inserted_access_rule).toBeDefined();
            expect(inserted_access_rule).not.toBeNull();
            expect(access_rule_schema.safeParse(inserted_access_rule).success).toBeTrue();
            expect(inserted_access_rule.action).toBe("drop");
            expect(inserted_access_rule.id).not.toBe("n/a");

            access_rule_for_update = inserted_access_rule;
        },
    );

    /******
     * Tests basic DAO functionality such as getAll() or getByID()
     ******* */
    test.serial(
        `${db_type} (DAO, ${table_name}: Expect to get back at least two record when calling getAll()`,
        async () => {
            const all_rules = await access_rules_dao.getAll();

            expect(Array.isArray(all_rules)).toBeTrue();
            expect(z.array(access_rule_schema).safeParse(all_rules).success).toBeTrue();
            expect(all_rules.length).toBeGreaterThanOrEqual(2);
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}: Expect to get a record back when querying using its id`,
        async () => {
            expect(access_rule_db).toBeDefined();
            access_rule_db = access_rule_db as access_rule;
            const expected_rule = await access_rules_dao.getById(access_rule_db.id);
            expect(expected_rule).toBeDefined();
            expect(expected_rule).not.toBeNull();
            expect(access_rule_schema.safeParse(expected_rule).success).toBeTrue();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}: Expect to get the catchall record for the test tenant when querying any IP`,
        async () => {
            expect(tenant_to_use).toBeDefined();

            const expected_rule = await access_rules_dao.getByIP("10.0.0.1", tenant_to_use.id);
            expect(expected_rule.length).toBeGreaterThanOrEqual(1);
        },
    );

    test.serial(`${db_type} (DAO, ${table_name}: Expect an edit to a rule to work`, async () => {
        expect(access_rule_for_update).toBeDefined();
        access_rule_for_update = access_rule_for_update as access_rule;
        const updated_rule = await access_rules_dao.update({
            ...access_rule_for_update,
            ip_block: "225.0.0.0/8",
            action: "accept",
        });

        expect(updated_rule).toBeDefined();
        expect(updated_rule).not.toBeNull();
        expect(access_rule_schema.safeParse(updated_rule).success).toBeTrue();

        const state_in_db = await access_rules_dao.getById(access_rule_for_update.id);

        expect(state_in_db).toBeDefined();
        expect(state_in_db).not.toBeNull();
        expect(access_rule_schema.safeParse(state_in_db).success).toBeTrue();

        expect(updated_rule.ip_block).toBe("225.0.0.0/8");
        expect(updated_rule.action).toBe("accept");
        expect(updated_rule.ip_block).toBe((state_in_db as access_rule).ip_block);
        expect(updated_rule.action).toBe((state_in_db as access_rule).action);
    });

    test.serial(
        `${db_type} (DAO, ${table_name}: Expect a deleted rule to actually disappear`,
        async () => {
            expect(access_rule_for_update).toBeDefined();
            access_rule_for_update = access_rule_for_update as access_rule;
            await access_rules_dao.delete(access_rule_for_update);

            const rule_that_was_just_deleted = await access_rules_dao.getById(
                access_rule_for_update.id,
            );
            expect(rule_that_was_just_deleted).toBeNull();
        },
    );

    /******
     * Tests that are run after the tenant, that all access rules have been associated with, has been deleted
     ******* */
    test.serial(
        `${db_type} (DAO, ${table_name}: Expect the auto-created rule to delete itself after the associated tenant is deleted`,
        async () => {
            expect(tenant_to_use).toBeDefined();
            expect(access_rule_db).toBeDefined;

            access_rule_db = access_rule_db as access_rule;

            await new Tenants().delete(tenant_to_use);
            const probably_deleted_access_rule = await access_rules_dao.getById(access_rule_db.id);
            expect(probably_deleted_access_rule).toBeNull();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}: Expect a rule insert associated with a non-existent tenant to fail`,
        async () => {
            expect(tenant_to_use).toBeDefined();
            const ip_range = cidr_to_range("0.0.0.0/0");
            let insert_did_throw = false;
            try {
                await access_rules_dao.insert({
                    id: "n/a",
                    tenants_id: tenant_to_use,
                    ip_block: "0.0.0.0/0",
                    start_ip: ip_range.range_start,
                    end_ip: ip_range.range_end,
                    priority: 1,
                    action: "drop",
                    name: "Test rule",
                });
            } catch (e) {
                Logger.debug(
                    `Got expected error from access_rules_dao insert to non-existing tenant: ${e}`,
                );
                insert_did_throw = true;
            }

            expect(insert_did_throw).toBeTrue();
        },
    );
}

await test_access_rules_table(new sqlite_access_rules(), "SQLite");
await test_access_rules_table(new Access_Rules(), "Facade");
