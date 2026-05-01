import { expect, test } from "bun:test";
import z from "zod";
import type { tenant } from "@/db_types";
import Logger from "@/logger";
import type { tenants_abstract } from "../../../shared/db/DAO/abstracts/tenants_abstract";
import type { SupportedDatabasesString } from "../../../shared/db/DAO/DAO";
import sqlite_tenants from "../../../shared/db/DAO/sqlite/tenants";
import Tenants from "../../../shared/db/DAO/tenants";
import { tenant_schema } from "../../../shared/utils/zod/zod_db_schemas";
import { setupDatabase } from "./utils";

/**
 * @description Runs tests for a given tenants dao
 * @param {signing_keys_abstract} tenants_dao The dao you want to test
 * @param {SupportedDatabasesString | 'Facade'} db_type The type of dao you are testing, this doesn't have an effect beyond test descriptions
 * */
export async function test_tenants_table(
    tenants_dao: tenants_abstract,
    db_type: SupportedDatabasesString | "Facade",
) {
    const table_name = "Tenants";

    let tenant_to_use: tenant | undefined;

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect insert() to behave normaly and returned value to adhere to schema`,
        async () => {
            const inserted_tenant = await tenants_dao.insert({
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

            expect(inserted_tenant).toBeDefined();
            expect(inserted_tenant).not.toBeNull();
            expect(tenant_schema.safeParse(inserted_tenant).success).toBeTrue();
            expect(inserted_tenant.id).not.toBe("n/a");

            tenant_to_use = inserted_tenant;
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect getAll() to behave normaly, return at least one value and returned value to adhere to schema`,
        async () => {
            expect(tenant_to_use).toBeDefined();
            tenant_to_use = tenant_to_use as tenant;

            const all_records = await tenants_dao.getAll();

            expect(all_records).toBeDefined();
            expect(Array.isArray(all_records)).toBeTrue();
            expect(all_records.length).toBeGreaterThanOrEqual(1);
            expect(z.array(tenant_schema).safeParse(all_records).success).toBeTrue();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect getById() to behave normaly and returned value to adhere to schema`,
        async () => {
            expect(tenant_to_use).toBeDefined();
            tenant_to_use = tenant_to_use as tenant;

            const record_by_id = await tenants_dao.getById(tenant_to_use.id);

            expect(record_by_id).toBeDefined();
            expect(record_by_id).not.toBeNull();
            expect(tenant_schema.safeParse(record_by_id).success).toBeTrue();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect getByName() to behave normaly and returned value to adhere to schema`,
        async () => {
            expect(tenant_to_use).toBeDefined();
            tenant_to_use = tenant_to_use as tenant;

            const all_records_by_name = await tenants_dao.getByName(tenant_to_use.name);

            expect(all_records_by_name).toBeDefined();
            expect(all_records_by_name).not.toBeNull();
            expect(Array.isArray(all_records_by_name)).toBeTrue();
            expect(all_records_by_name.length).toBeGreaterThanOrEqual(1);
            expect(z.array(tenant_schema).safeParse(all_records_by_name).success).toBeTrue();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect an Edit to work and that edit be reflected in the database`,
        async () => {
            expect(tenant_to_use).toBeDefined();
            tenant_to_use = tenant_to_use as tenant;

            const new_name = Bun.randomUUIDv7();
            const updated_record = await tenants_dao.update({
                ...tenant_to_use,
                name: new_name,
                ttl: 200,
                uri: "https://iglu.example.com/test",
            });

            expect(updated_record).toBeDefined();
            expect(updated_record).not.toBeNull();
            expect(tenant_schema.safeParse(updated_record).success).toBeTrue();

            const record_in_db = await tenants_dao.getById(tenant_to_use.id);

            expect(record_in_db).toBeDefined();
            expect(record_in_db).not.toBeNull();
            expect(tenant_schema.safeParse(record_in_db).success).toBeTrue();
            expect(updated_record.name).toBe(new_name);
            expect(updated_record.ttl).toBe(200);
            expect(updated_record.uri).toBe("https://iglu.example.com/test");
            expect(updated_record.name).toBe((record_in_db as tenant).name);
            expect(updated_record.ttl).toBe((record_in_db as tenant).ttl);
            expect(updated_record.uri).toBe((record_in_db as tenant).uri);
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect a deletion to work and be reflected in the database`,
        async () => {
            expect(tenant_to_use).toBeDefined();
            tenant_to_use = tenant_to_use as tenant;

            const current_db_state = await tenants_dao.getById(tenant_to_use.id);

            expect(current_db_state).toBeDefined();
            expect(current_db_state).not.toBeNull();
            expect(tenant_schema.safeParse(current_db_state).success).toBeTrue();

            await tenants_dao.delete(tenant_to_use);

            const db_state_after_deletion = await tenants_dao.getById(tenant_to_use.id);

            expect(db_state_after_deletion).toBeDefined();
            expect(db_state_after_deletion).toBeNull();
        },
    );
}

Logger.setLogLevel("WARN");
await setupDatabase("SQLite");
await test_tenants_table(new sqlite_tenants(), "SQLite");
await test_tenants_table(new Tenants(), "Facade");
