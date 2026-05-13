import { expect, test } from "bun:test";
import z from "zod";
import type { signing_key } from "@/db_types";
import Logger from "@/logger";
import type { signing_keys_abstract } from "../../../shared/db/DAO/abstracts/signing_keys_abstract";
import { Api_keys } from "../../../shared/db/DAO/api_key";
import { Api_keys_tenants_link } from "../../../shared/db/DAO/api_key_tenant_link";
import type { SupportedDatabasesString } from "../../../shared/db/DAO/DAO";
import { Signing_Keys } from "../../../shared/db/DAO/signing_keys";
import sqlite_signing_keys from "../../../shared/db/DAO/sqlite/signing_keys";
import { Tenants } from "../../../shared/db/DAO/tenants";
import { hashApiKey } from "../../../shared/utils/crypto/api_key_generation";
import { signing_keys_schema } from "../../../shared/utils/zod/zod_db_schemas";

/**
 * @description Runs tests for a given signing keys dao
 * @param {signing_keys_abstract} signing_keys_dao The dao you want to test
 * @param {SupportedDatabasesString | 'Facade'} db_type The type of dao you are testing, this doesn't have an effect beyond test descriptions
 * */
export async function test_signing_keys_table(
    signing_keys_dao: signing_keys_abstract,
    db_type: SupportedDatabasesString | "Facade",
) {
    const table_name = "Signing_keys";

    const api_key_to_use = await new Api_keys().insert({
        id: "n/a",
        name: "Derivation_test",
        hash: hashApiKey(Bun.randomUUIDv7()),
    });

    let key_to_use: signing_key | undefined;

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect insert() to behave normaly and returned value to adhere to schema`,
        async () => {
            expect(api_key_to_use).toBeDefined();

            const inserted_signing_key = await signing_keys_dao.insert({
                id: "n/a",
                api_keys_id: api_key_to_use,
                key: Bun.randomUUIDv7(),
                name: "My cool signing key",
            });

            expect(inserted_signing_key).toBeDefined();
            expect(signing_keys_schema.safeParse(inserted_signing_key).success).toBeTrue();
            expect(inserted_signing_key.id).not.toBe("n/a");

            key_to_use = inserted_signing_key;
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect getAll() to behave normaly, return at least one value and returned value to adhere to schema`,
        async () => {
            expect(key_to_use).toBeDefined();
            key_to_use = key_to_use as signing_key;

            const all_records = await signing_keys_dao.getAll();

            expect(all_records).toBeDefined();
            expect(Array.isArray(all_records)).toBeTrue();
            expect(all_records.length).toBeGreaterThanOrEqual(1);
            expect(z.array(signing_keys_schema).safeParse(all_records).success).toBeTrue();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect getById() to behave normaly and returned value to adhere to schema`,
        async () => {
            expect(key_to_use).toBeDefined();
            key_to_use = key_to_use as signing_key;

            const record_by_id = await signing_keys_dao.getById(key_to_use.id);

            expect(record_by_id).toBeDefined();
            expect(record_by_id).not.toBeNull();
            expect(signing_keys_schema.safeParse(record_by_id).success).toBeTrue();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect getByTenant() to behave normaly and returned value to adhere to schema`,
        async () => {
            expect(key_to_use).toBeDefined();
            key_to_use = key_to_use as signing_key;

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
            await new Api_keys_tenants_link().insert({
                id: "n/a",
                api_keys_id: api_key_to_use,
                tenants_id: tenant,
            });

            const by_tenant = await signing_keys_dao.getByTenant(tenant.id);

            expect(by_tenant).toBeDefined();
            expect(by_tenant).not.toBeNull();
            expect(Array.isArray(by_tenant)).toBeTrue();
            expect(by_tenant.length).toBeGreaterThanOrEqual(1);
            expect(z.array(signing_keys_schema).safeParse(by_tenant).success).toBeTrue();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect getByApiKeyId() to behave normaly and returned value to adhere to schema`,
        async () => {
            expect(key_to_use).toBeDefined();
            key_to_use = key_to_use as signing_key;

            const by_api_key_id = await signing_keys_dao.getByApiKeyId(api_key_to_use.id);

            expect(by_api_key_id).toBeDefined();
            expect(by_api_key_id).not.toBeNull();
            expect(signing_keys_schema.safeParse(by_api_key_id).success).toBeTrue();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect an Edit to work and that edit be reflected in the database`,
        async () => {
            expect(key_to_use).toBeDefined();
            key_to_use = key_to_use as signing_key;

            const key = Bun.randomUUIDv7();
            console.log(key);
            const updated_record = await signing_keys_dao.update({
                ...key_to_use,
                key: key,
                name: "Updated name",
            });

            expect(updated_record).toBeDefined();
            expect(updated_record).not.toBeNull();
            expect(signing_keys_schema.safeParse(updated_record).success).toBeTrue();

            const record_in_db = await signing_keys_dao.getById(key_to_use.id);

            expect(record_in_db).toBeDefined();
            expect(record_in_db).not.toBeNull();
            expect(signing_keys_schema.safeParse(record_in_db).success).toBeTrue();
            expect(updated_record.key).toBe(key);
            expect(updated_record.name).toBe("Updated name");
            expect(updated_record.key).toBe((record_in_db as signing_key).key);
            expect(updated_record.name).toBe((record_in_db as signing_key).name);
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect a deletion to work and be reflected in the database`,
        async () => {
            expect(key_to_use).toBeDefined();
            key_to_use = key_to_use as signing_key;

            const current_db_state = await signing_keys_dao.getById(key_to_use.id);

            expect(current_db_state).toBeDefined();
            expect(current_db_state).not.toBeNull();
            expect(signing_keys_schema.safeParse(current_db_state).success).toBeTrue();

            await signing_keys_dao.delete(key_to_use);

            const db_state_after_deletion = await signing_keys_dao.getById(key_to_use.id);

            expect(db_state_after_deletion).toBeDefined();
            expect(db_state_after_deletion).toBeNull();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect the deletion of an api key to also delete all signing keys associated with it`,
        async () => {
            const signing_key_inserted = await signing_keys_dao.insert({
                id: "n/a",
                api_keys_id: api_key_to_use,
                key: Bun.randomUUIDv7(),
                name: "My cool signing key",
            });

            expect(signing_key_inserted).toBeDefined();
            expect(signing_key_inserted).not.toBeNull();
            expect(signing_keys_schema.safeParse(signing_key_inserted).success).toBeTrue();

            await new Api_keys().delete(api_key_to_use);

            const signing_key_in_db = await signing_keys_dao.getById(signing_key_inserted.id);

            expect(signing_key_in_db).toBeDefined();
            expect(signing_key_in_db).toBeNull();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect an insert referring to an non-existant api link to fail`,
        async () => {
            expect(key_to_use).toBeDefined();
            key_to_use = key_to_use as signing_key;

            let insert_did_throw = false;
            try {
                await signing_keys_dao.insert({
                    ...key_to_use,
                    api_keys_id: {
                        ...api_key_to_use,
                        id: "non-existant-api-key",
                    },
                });
            } catch (e) {
                Logger.debug(`Received expected error: ${e}`);
                insert_did_throw = true;
            }

            expect(insert_did_throw).toBeTrue();
        },
    );
}

await test_signing_keys_table(new sqlite_signing_keys(), "SQLite");
await test_signing_keys_table(new Signing_Keys(), "Facade");
