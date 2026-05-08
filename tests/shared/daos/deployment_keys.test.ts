import { expect, test } from "bun:test";
import z from "zod";
import type { deployment_key } from "@/db_types";
import Logger from "@/logger";
import type { deployment_key_abstract } from "../../../shared/db/DAO/abstracts/deployment_key_abstract";
import type { SupportedDatabasesString } from "../../../shared/db/DAO/DAO";
import { Deployment_keys } from "../../../shared/db/DAO/deployment_keys";
import { sqlite_deployment_keys } from "../../../shared/db/DAO/sqlite/deployment_keys";
import { Tenants } from "../../../shared/db/DAO/tenants";
import { hashApiKey } from "../../../shared/utils/crypto/api_key_generation";
import { deployment_key_schema } from "../../../shared/utils/zod/zod_db_schemas";
import { setupDatabase } from "./utils";

/**
 * @description Runs tests for a given agent dao
 * @param {deployment_key_abstract} deployment_keys_dao The dao you want to test
 * @param {SupportedDatabasesString | 'Facade'} db_type The type of dao you are testing, this doesn't have an effect beyond test descriptions
 * */
export async function test_deployment_keys_table(
    deployment_keys_dao: deployment_key_abstract,
    db_type: SupportedDatabasesString | "Facade",
) {
    const table_name = "Deployment_keys";
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

    let deployment_key_to_use: deployment_key | undefined;

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect insert() to behave normaly and returned value to adhere to schema`,
        async () => {
            expect(tenant_to_use, "Tenant to use not defined").toBeDefined();
            const inserted_record = await deployment_keys_dao.insert({
                id: "n/a",
                tenants_id: tenant_to_use,
                type: "agent",
                hash: hashApiKey(Bun.randomUUIDv7()),
                expires_at: 10,
                created_at: 0,
                name: "A random Key for testing",
            });

            expect(inserted_record).toBeDefined();
            expect(inserted_record).not.toBeNull();
            expect(inserted_record.id).not.toBe("n/a");
            expect(deployment_key_schema.safeParse(inserted_record).success).toBeTrue();

            const record_in_db = await deployment_keys_dao.getById(inserted_record.id);

            expect(record_in_db).toBeDefined();
            expect(inserted_record).not.toBeNull();
            expect(deployment_key_schema.safeParse(record_in_db).success).toBeTrue();
            expect(JSON.stringify(inserted_record)).toBe(JSON.stringify(record_in_db));
            deployment_key_to_use = inserted_record;
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect getAll() to behave normaly and returned value to adhere to schema`,
        async () => {
            expect(deployment_key_to_use, "Deployment key to use not defined").toBeDefined();
            deployment_key_to_use = deployment_key_to_use as deployment_key;

            const all_records_in_db = await deployment_keys_dao.getAll();

            expect(all_records_in_db.length).toBeGreaterThanOrEqual(1);
            expect(z.array(deployment_key_schema).safeParse(all_records_in_db).success).toBeTrue();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect getById() to behave normaly and returned value to adhere to schema`,
        async () => {
            expect(deployment_key_to_use, "Deployment key to use not defined").toBeDefined();
            deployment_key_to_use = deployment_key_to_use as deployment_key;

            const record_by_id = await deployment_keys_dao.getById(deployment_key_to_use.id);

            expect(record_by_id).toBeDefined();
            expect(record_by_id).not.toBeNull();
            expect(record_by_id?.id).toBe(deployment_key_to_use.id);
            expect(deployment_key_schema.safeParse(record_by_id).success).toBeTrue();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect getByHash() to behave normaly and returned value to adhere to schema`,
        async () => {
            expect(deployment_key_to_use, "Deployment key to use not defined").toBeDefined();
            deployment_key_to_use = deployment_key_to_use as deployment_key;

            const record_by_hash = await deployment_keys_dao.getByHash(deployment_key_to_use.hash);

            expect(
                record_by_hash,
                "Expected returned record by hash to be defined, got undefined instead",
            ).toBeDefined();
            expect(
                record_by_hash,
                "Expected returned record by hash to be non-null, got null instead",
            ).not.toBeNull();
            expect(
                record_by_hash?.id,
                "Expected the id of the returned record to be the same as the one that was selected from, got another one instead",
            ).toBe(deployment_key_to_use.id);
            expect(
                deployment_key_schema.safeParse(record_by_hash).success,
                "Expected returned value from database to be of the deployment_key schema, zod failed to validate instead",
            ).toBeTrue();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect update() to behave normaly and record to be updated in the database`,
        async () => {
            expect(deployment_key_to_use, "Deployment key to use not defined").toBeDefined();
            deployment_key_to_use = deployment_key_to_use as deployment_key;

            const updated_record = await deployment_keys_dao.update({
                ...deployment_key_to_use,
                name: "cool_name",
                type: "activate",
            });

            expect(
                updated_record,
                "Expected updated record to be defined, got undefined instead (which is against type!)",
            ).toBeDefined();
            expect(
                deployment_key_schema.safeParse(updated_record).success,
                "Expected updated record to follow the deployment_keys schema, zod failed to validate record instead",
            ).toBeTrue();

            const record_in_db = await deployment_keys_dao.getById(updated_record.id);

            expect(record_in_db).toBeDefined();
            expect(
                record_in_db,
                "Expected updated record to be found via id, got null record instead",
            ).not.toBeNull();
            expect(
                deployment_key_schema.safeParse(record_in_db).success,
                "Expected updated record to follow deployment_keys schema, zod failed to validate record instead",
            ).toBeTrue();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect delete() to behave normaly and record to be deleted in database`,
        async () => {
            expect(deployment_key_to_use, "Deployment key to use not defined").toBeDefined();
            deployment_key_to_use = deployment_key_to_use as deployment_key;

            await deployment_keys_dao.delete(deployment_key_to_use);

            const deleted_record_in_db = await deployment_keys_dao.getById(
                deployment_key_to_use.id,
            );

            expect(
                deleted_record_in_db,
                "Expected deleted_record_in_db to be defined (as null) got undefined which is against type",
            ).toBeDefined();
            expect(
                deleted_record_in_db,
                "Expected deleted_record_in_db to be null, got an actual record instead",
            ).toBeNull();
            expect(
                deployment_key_schema.safeParse(deleted_record_in_db).success,
                "Expected deleted_record_in_db to fail zod schema validation, got success instead which indicates a record that was never deleted",
            ).toBeFalse();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect an insert that would result in duplicate hashes be rejected`,
        async () => {
            const key_1 = await deployment_keys_dao.insert({
                id: "n/a",
                tenants_id: tenant_to_use,
                type: "agent",
                hash: hashApiKey(Bun.randomUUIDv7()),
                expires_at: 10,
                created_at: 0,
                name: "A random Key for testing",
            });
            expect(
                key_1,
                "The first key that was supposed to be inserted is not defined",
            ).toBeDefined();
            deployment_key_to_use = deployment_key_to_use as deployment_key;

            let insert_did_throw = false;
            try {
                await deployment_keys_dao.insert(key_1);
            } catch (e) {
                Logger.debug(`Got expected error while inserting into deployment_keys table: ${e}`);
                insert_did_throw = true;
            }

            expect(
                insert_did_throw,
                "Expected the second insert statement (with the same key hash) to be rejected",
            ).toBeTrue();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect a tenant deletion to also delete all deployment keys associated with it`,
        async () => {
            deployment_key_to_use = await deployment_keys_dao.insert({
                id: "n/a",
                tenants_id: tenant_to_use,
                type: "agent",
                hash: hashApiKey(Bun.randomUUIDv7()),
                expires_at: 10,
                created_at: 0,
                name: "A random Key for testing",
            });

            expect(deployment_key_to_use, "Deployment key to use not defined").toBeDefined();
            deployment_key_to_use = deployment_key_to_use as deployment_key;

            await new Tenants().delete(tenant_to_use);

            const record_in_db = await deployment_keys_dao.getById(deployment_key_to_use.id);

            expect(
                record_in_db,
                "Expected record_in_db to be defined (as null) got undefined which is against type",
            ).toBeDefined();
            expect(
                record_in_db,
                "Expected record_in_db to be null, got an actual record instead",
            ).toBeNull();
            expect(
                deployment_key_schema.safeParse(record_in_db).success,
                "Expected deleted_record_in_db to fail zod schema validation, got success instead which indicates a record that was never deleted",
            ).toBeFalse();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect an insert that refers to a non-existent cache to fail`,
        async () => {
            expect(deployment_key_to_use).toBeDefined();
            expect(tenant_to_use).toBeDefined();
            deployment_key_to_use = deployment_key_to_use as deployment_key;

            let insert_did_throw = false;
            try {
                await deployment_keys_dao.insert({
                    ...deployment_key_to_use,
                    tenants_id: {
                        ...tenant_to_use,
                        id: "non-existant",
                    },
                });
            } catch (e) {
                Logger.debug(`Received expected error in insert: ${e}`);
                insert_did_throw = true;
            }

            expect(insert_did_throw);
        },
    );
}

Logger.setLogLevel("WARN");
await setupDatabase("SQLite");
await test_deployment_keys_table(new sqlite_deployment_keys(), "SQLite");
await test_deployment_keys_table(new Deployment_keys(), "Facade");
