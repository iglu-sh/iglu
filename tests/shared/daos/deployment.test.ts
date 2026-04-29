import { expect, test } from "bun:test";
import z from "zod";
import type { deployment } from "@/db_types";
import Logger from "@/logger";
import type { deployment_abstract } from "../../../shared/db/DAO/abstracts/deployment_abstract";
import type { SupportedDatabasesString } from "../../../shared/db/DAO/DAO";
import { Deployments } from "../../../shared/db/DAO/deployment";
import Deployment_keys from "../../../shared/db/DAO/deployment_keys";
import { sqlite_deployment } from "../../../shared/db/DAO/sqlite/deployment";
import Tenants from "../../../shared/db/DAO/tenants";
import { deployment_schema } from "../../../shared/utils/zod/zod_db_schemas";
import { setupDatabase } from "./utils";

/**
 * @description Runs tests for a given agent dao
 * @param {deployment_abstract} deployment_dao The dao you want to test
 * @param {SupportedDatabasesString | 'Facade'} db_type The type of dao you are testing, this doesn't have an effect beyond test descriptions
 * */
export async function test_deployment_table(
    deployment_dao: deployment_abstract,
    db_type: SupportedDatabasesString | "Facade",
) {
    const table_name = "Deployments";
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
    const deployment_key_to_use = await new Deployment_keys().insert({
        id: "n/a",
        tenants_id: tenant_to_use,
        type: "activate",
        hash: "12345",
        expires_at: 10,
        created_at: 11,
        name: "test activation",
    });
    let deployment_to_use: deployment | undefined;
    test.serial(
        `${db_type} (DAO, ${table_name}): Expect insert() to behave normaly and returned value to adhere to schema`,
        async () => {
            expect(tenant_to_use).toBeDefined();
            expect(deployment_key_to_use).toBeDefined();

            const inserted_record = await deployment_dao.insert({
                id: "n/a",
                tenants_id: tenant_to_use,
                created_at: 0,
                start_time: 0,
                end_time: 0,
                closure_size: null,
                status: "Pending",
                deploy_json: "{}",
                deployment_index: 0,
                store_path: "/nix/store/volanta",
                key_used: deployment_key_to_use,
            });

            expect(inserted_record).toBeDefined();
            expect(inserted_record.id).not.toBe("n/a");
            expect(deployment_schema.safeParse(inserted_record).success).toBeTrue();

            const is_actually_in_db = await deployment_dao.getById(inserted_record.id);

            expect(is_actually_in_db).toBeDefined();
            expect(is_actually_in_db).not.toBe(null);
            expect(deployment_schema.safeParse(is_actually_in_db).success).toBeTrue();
            deployment_to_use = inserted_record;
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect getAll() to behave normaly and returned value to adhere to schema`,
        async () => {
            expect(deployment_to_use).toBeDefined();

            const all_records = await deployment_dao.getAll();

            expect(all_records.length).toBeGreaterThanOrEqual(1);
            expect(z.array(deployment_schema).safeParse(all_records).success).toBeTrue();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect getById() to behave normaly and returned value to adhere to schema`,
        async () => {
            expect(deployment_to_use).toBeDefined();
            deployment_to_use = deployment_to_use as deployment;

            const record_in_db = await deployment_dao.getById(deployment_to_use.id);

            expect(record_in_db).toBeDefined();
            expect(record_in_db).not.toBeNull();
            expect(deployment_schema.safeParse(record_in_db).success).toBeTrue();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect an edit to work and to be reflected in the database`,
        async () => {
            expect(deployment_to_use).toBeDefined();
            deployment_to_use = deployment_to_use as deployment;

            const updated_record = await deployment_dao.update({
                ...deployment_to_use,
                closure_size: 120,
                status: "InProgress",
            });
            expect(updated_record).toBeDefined();
            expect(deployment_schema.safeParse(updated_record).success).toBeTrue();

            const record_in_db = await deployment_dao.getById(deployment_to_use.id);

            expect(record_in_db).toBeDefined();
            expect(record_in_db).not.toBeNull();
            expect(deployment_schema.safeParse(record_in_db).success).toBeTrue();
            if (record_in_db === null) {
                Logger.error("panic(tests): An edit resulted in that record not being available");
                throw new Error(
                    "panic(tests): An edit resulted in that record not being available",
                );
            }

            expect(updated_record.closure_size).toBe(record_in_db.closure_size);
            expect(updated_record.closure_size).toBe(120);
            expect(updated_record.status).toBe(record_in_db.status);
            expect(updated_record.status).toBe("InProgress");
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect a deletion to be reflected in the database`,
        async () => {
            expect(deployment_to_use).toBeDefined();
            deployment_to_use = deployment_to_use as deployment;

            const record_in_db = await deployment_dao.getById(deployment_to_use.id);
            expect(record_in_db).toBeDefined();
            expect(record_in_db).not.toBeNull();
            expect(deployment_schema.safeParse(record_in_db).success).toBeTrue();
            if (record_in_db === null) {
                Logger.error(
                    "panic(tests): A record that is subject to being tested cannot be found or has dissapeared",
                );
                throw new Error(
                    "panic(tests): A record that is subject to being tested cannot be found or has dissapeared",
                );
            }

            await deployment_dao.delete(deployment_to_use);

            const record_now_in_db = await deployment_dao.getById(deployment_to_use.id);

            expect(record_now_in_db).toBeNull();
        },
    );
}

Logger.setLogLevel("WARN");
await setupDatabase("SQLite");
await test_deployment_table(new sqlite_deployment(), "SQLite");
await test_deployment_table(new Deployments(), "Facade");
