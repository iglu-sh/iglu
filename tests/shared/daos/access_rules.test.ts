import { test, expect } from "bun:test";
import type { access_rules_abstract } from "../../../shared/db/DAO/abstracts/access_rules_abstract";
import type { SupportedDatabasesString } from "../../../shared/db/DAO/DAO";
import type { access_rule, tenant } from "@/db_types";
import Tenants from "../../../shared/db/DAO/tenants";
import Logger from "@/logger";
import sqlite_access_rules from "../../../shared/db/DAO/sqlite/access_rules";
import { setupDatabase } from "./utils";
import { access_rule_schema } from "../../../shared/utils/zod/zod_db_schemas";
import { cidr_to_range } from "../../../shared/utils/ip";
import Access_Rules from "../../../shared/db/DAO/access_rules";

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
    let tenant_db: tenant | undefined;
    const table_name = "Access_rules";

    /******
     * Tests that verify creation in the two ways an access rule can be defined: during tenant creation and standalone creation
     ******* */
    test.serial(
        `${db_type} (DAO, ${table_name}): Expect tenant insert to create at least one access_rule`,
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

            const access_rules_in_db_for_created_tenant = await access_rules_dao.getByTenant(
                tenant_to_use.id,
            );
            expect(access_rules_in_db_for_created_tenant.length).toBeGreaterThan(0);
            expect(access_rules_in_db_for_created_tenant[0]?.action).toBe("accept");
            tenant_db = tenant_to_use;
            access_rule_db = access_rules_in_db_for_created_tenant[0];
            expect(access_rule_schema.safeParse(access_rule_db).success).toBeTrue();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}: Expect standalone access_rule insert to work and adhere to zod schem: Expect standalone access_rule insert to work and adhere to zod schema`,
        async () => {
            expect(tenant_db).toBeDefined();
            if (!tenant_db) {
                Logger.error("I need an inserted tenant to complete this test");
                throw new Error("I need an inserted tenant to complete this test");
            }

            const ip_range = cidr_to_range("224.0.0.0/8");
            const inserted_access_rule = await access_rules_dao.insert({
                id: "n/a",
                tenants_id: tenant_db,
                ip_block: "224.0.0.0/8", // Fun fact: This is an unassagined /8 block that goes to 239.0.0.0/8 and you are free to use in your networks
                start_ip: ip_range.range_start,
                end_ip: ip_range.range_end,
                priority: 1,
                action: "drop",
                name: "Test rule",
            });
            expect(inserted_access_rule).toBeDefined();
            expect(inserted_access_rule.action).toBe("drop");
            expect(inserted_access_rule.id === "n/a").toBeFalse();
            expect(access_rule_schema.safeParse(inserted_access_rule).success).toBeTrue();

            access_rule_for_update = inserted_access_rule;
        },
    );

    /******
     * Tests that test basic DAO functionality such as getAll() or getByID()
     ******* */
    test.serial(
        `${db_type} (DAO, ${table_name}: Expect to get back at least two record when calling getAll()`,
        async () => {
            const all_rules = await access_rules_dao.getAll();

            expect(Array.isArray(all_rules)).toBeTrue();
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
            expect(expected_rule === null).toBeFalse();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}: Expect to get the catchall record for the test tenant when querying any IP`,
        async () => {
            expect(tenant_db).toBeDefined();
            tenant_db = tenant_db as tenant;
            const expected_rule = await access_rules_dao.getByIP("10.0.0.1", tenant_db.id);
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

        expect(updated_rule.ip_block).toBe("225.0.0.0/8");
        expect(updated_rule.action).toBe("accept");
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
     * Tests that are run after the tenant that all access rules have been associated with has been deleted
     ******* */
    test.serial(
        `${db_type} (DAO, ${table_name}: Expect the auto-created rule to delete itself after the associated tenant is delted)`,
        async () => {
            expect(tenant_db).toBeDefined();
            expect(access_rule_db).toBeDefined;
            tenant_db = tenant_db as tenant;
            access_rule_db = access_rule_db as access_rule;

            await new Tenants().delete(tenant_db);
            const probably_deleted_access_rule = await access_rules_dao.getById(access_rule_db.id);
            expect(probably_deleted_access_rule).toBeNull();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}: Expect a rule insert associated with a non-existent tenant to fail`,
        async () => {
            expect(tenant_db).toBeDefined();
            tenant_db = tenant_db as tenant;
            const ip_range = cidr_to_range("0.0.0.0/0");
            let insert_did_throw = false;
            try {
                await access_rules_dao.insert({
                    id: "n/a",
                    tenants_id: tenant_db,
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

Logger.setLogLevel("WARN");
await setupDatabase("SQLite");
await test_access_rules_table(new sqlite_access_rules(), "SQLite");
await test_access_rules_table(new Access_Rules(), "Facade");
