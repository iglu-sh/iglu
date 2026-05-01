import { expect, test } from "bun:test";
import z from "zod";
import type { upload } from "@/db_types";
import Logger from "@/logger";
import type { uploads_abstract } from "../../../shared/db/DAO/abstracts/uploads_abstract";
import Api_keys from "../../../shared/db/DAO/api_key";
import { Api_keys_tenants_link } from "../../../shared/db/DAO/api_key_tenant_link";
import type { SupportedDatabasesString } from "../../../shared/db/DAO/DAO";
import { sqlite_uploads } from "../../../shared/db/DAO/sqlite/uploads";
import Tenants from "../../../shared/db/DAO/tenants";
import Uploads from "../../../shared/db/DAO/uploads";
import { hashApiKey } from "../../../shared/utils/crypto/api_key_generation";
import { uploads_schema } from "../../../shared/utils/zod/zod_db_schemas";
import { setupDatabase } from "./utils";

/**
 * @description Runs tests for a given signing keys dao
 * @param {uploads_abstract} uploads_dao The dao you want to test
 * @param {SupportedDatabasesString | 'Facade'} db_type The type of dao you are testing, this doesn't have an effect beyond test descriptions
 * */
export async function test_uploads_table(
    uploads_dao: uploads_abstract,
    db_type: SupportedDatabasesString | "Facade",
) {
    const table_name = "Uploads";
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
    const api_key_to_use = await new Api_keys().insert({
        id: "n/a",
        name: "Derivation_test",
        hash: hashApiKey(Bun.randomUUIDv7()),
    });

    await new Api_keys_tenants_link().insert({
        id: "n/a",
        api_keys_id: api_key_to_use,
        tenants_id: tenant_to_use,
    });

    let upload_to_use: upload | undefined;
    test.serial(
        `${db_type} (DAO, ${table_name}): Expect insert() to behave normaly and returned value to adhere to schema`,
        async () => {
            const inserted_upload = await uploads_dao.insert({
                id: "n/a",
                tenants_id: tenant_to_use,
                signed_by: api_key_to_use,
                md5: "735b90b4568125ed6c3f678819b6e058",
                compression: "xz",
            });

            expect(inserted_upload).toBeDefined();
            expect(uploads_schema.safeParse(inserted_upload).success).toBeTrue();
            expect(inserted_upload.id).not.toBe("n/a");

            upload_to_use = inserted_upload;
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect getAll() to behave normaly, return at least one value and returned value to adhere to schema`,
        async () => {
            expect(upload_to_use);
            upload_to_use = upload_to_use as upload;

            const all_records = await uploads_dao.getAll();
            expect(all_records).toBeDefined();
            expect(Array.isArray(all_records)).toBeTrue();
            expect(all_records.length).toBeGreaterThanOrEqual(1);
            expect(z.array(uploads_schema).safeParse(all_records).success).toBeTrue();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect getById() to behave normaly and returned value to adhere to schema`,
        async () => {
            expect(upload_to_use);
            upload_to_use = upload_to_use as upload;

            const record_by_id = await uploads_dao.getById(upload_to_use.id);

            expect(record_by_id).toBeDefined();
            expect(record_by_id).not.toBeNull();
            expect(uploads_schema.safeParse(record_by_id).success).toBeTrue();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect an Edit to work and that edit be reflected in the database`,
        async () => {
            expect(upload_to_use);
            upload_to_use = upload_to_use as upload;

            const updated_record = await uploads_dao.update({
                ...upload_to_use,
                md5: "14bfa6bb14875e45bba028a21ed38046",
                compression: "zstd",
            });

            expect(updated_record).toBeDefined();
            expect(updated_record).not.toBeNull();
            expect(uploads_schema.safeParse(updated_record).success).toBeTrue();

            const record_in_db = await uploads_dao.getById(upload_to_use.id);

            expect(record_in_db).toBeDefined();
            expect(record_in_db).not.toBeNull();
            expect(uploads_schema.safeParse(record_in_db).success).toBeTrue();
            expect(updated_record.md5).toBe("14bfa6bb14875e45bba028a21ed38046");
            expect(updated_record.compression).toBe("zstd");
            expect(updated_record.md5).toBe((record_in_db as upload).md5);
            expect(updated_record.compression).toBe((record_in_db as upload).compression);
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect a deletion to work and be reflected in the database`,
        async () => {
            expect(upload_to_use);
            upload_to_use = upload_to_use as upload;

            const current_db_state = await uploads_dao.getById(upload_to_use.id);

            expect(current_db_state).toBeDefined();
            expect(current_db_state).not.toBeNull();
            expect(uploads_schema.safeParse(current_db_state).success).toBeTrue();

            await uploads_dao.delete(upload_to_use);

            const db_state_after_deletion = await uploads_dao.getById(upload_to_use.id);

            expect(db_state_after_deletion).toBeDefined();
            expect(db_state_after_deletion).toBeNull();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect the deletion of an api key to also delete all uploads associated by it`,
        async () => {
            expect(api_key_to_use).toBeDefined();

            const new_upload = await uploads_dao.insert({
                id: "n/a",
                tenants_id: tenant_to_use,
                signed_by: api_key_to_use,
                md5: "735b90b4568125ed6c3f678819b6e058",
                compression: "xz",
            });

            expect(new_upload).toBeDefined();
            expect(new_upload).not.toBeNull();
            expect(uploads_schema.safeParse(new_upload).success).toBeTrue();

            await new Api_keys().delete(api_key_to_use);

            const upload_in_db = await uploads_dao.getById(new_upload.id);

            expect(upload_in_db).toBeDefined();
            expect(upload_in_db).toBeNull();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect the deletion of a tenant to also delete all uploads associated by it`,
        async () => {
            expect(tenant_to_use).toBeDefined();

            const api_key = await new Api_keys().insert({
                id: "n/a",
                name: "Derivation_test",
                hash: hashApiKey(Bun.randomUUIDv7()),
            });
            await new Api_keys_tenants_link().insert({
                id: "n/a",
                api_keys_id: api_key,
                tenants_id: tenant_to_use,
            });
            const new_upload = await uploads_dao.insert({
                id: "n/a",
                tenants_id: tenant_to_use,
                signed_by: api_key,
                md5: "735b90b4568125ed6c3f678819b6e058",
                compression: "xz",
            });

            expect(new_upload).toBeDefined();
            expect(new_upload).not.toBeNull();
            expect(uploads_schema.safeParse(new_upload).success).toBeTrue();
            await new Tenants().delete(tenant_to_use);

            const upload_in_db = await uploads_dao.getById(new_upload.id);

            expect(upload_in_db).toBeDefined();
            expect(upload_in_db).toBeNull();
        },
    );
}

Logger.setLogLevel("WARN");
await setupDatabase("SQLite");
await test_uploads_table(new sqlite_uploads(), "SQLite");
await test_uploads_table(new Uploads(), "Facade");
