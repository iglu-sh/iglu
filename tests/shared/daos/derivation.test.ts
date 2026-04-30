import { expect, test } from "bun:test";
import z from "zod";
import type { derivation } from "@/db_types";
import Logger from "@/logger";
import type { derivations_abstract } from "../../../shared/db/DAO/abstracts/derivations_abstract";
import Api_keys from "../../../shared/db/DAO/api_key";
import type { SupportedDatabasesString } from "../../../shared/db/DAO/DAO";
import Derivations from "../../../shared/db/DAO/derivation";
import Signing_Keys from "../../../shared/db/DAO/signing_keys";
import sqlite_derivations from "../../../shared/db/DAO/sqlite/derivations";
import Tenants from "../../../shared/db/DAO/tenants";
import { hashApiKey } from "../../../shared/utils/crypto/api_key_generation";
import { derivations_schema } from "../../../shared/utils/zod/zod_db_schemas";
import { setupDatabase } from "./utils";

/**
 * @description Runs tests for a given derivations dao
 * @param {derivations_abstract} derivations_dao The dao you want to test
 * @param {SupportedDatabasesString | 'Facade'} db_type The type of dao you are testing, this doesn't have an effect beyond test descriptions
 * */
export async function test_derivations_table(
    derivations_dao: derivations_abstract,
    db_type: SupportedDatabasesString | "Facade",
) {
    const table_name = "Derivations";

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

    const signing_key_to_use = await new Signing_Keys().insert({
        id: "n/a",
        api_keys_id: api_key_to_use,
        key: "this is a very cool signing key",
        name: "My cool signing key",
    });

    let derivation_to_use: derivation | undefined;

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect insert() to behave normaly and returned value to adhere to schema`,
        async () => {
            expect(tenant_to_use).toBeDefined();

            const inserted_derivation = await derivations_dao.insert({
                id: "n/a",
                signing_keys_id: signing_key_to_use,
                cderiver: "test",
                cstorehash: "test",
                cfilehash: "test",
                cfilesize: 0,
                cnarhash: "test",
                cnarsize: "0",
                compression: "xz",
                creferences: "test",
                csig: "test",
                cstoresuffix: "test",
                parts: "",
            });
            expect(inserted_derivation).toBeDefined();
            expect(
                inserted_derivation.id,
                "Expected to get a generated ID back from the insert operation, received n/a instead which is the one that was set as a placeholder",
            ).not.toBe("n/a");
            expect(
                derivations_schema.safeParse(inserted_derivation).success,
                "Expected zod schema validation to succeed, got failed instead",
            ).toBeTrue();

            derivation_to_use = inserted_derivation;
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect getAll() to behave normaly, return at least one value and returned value to adhere to schema`,
        async () => {
            expect(
                derivation_to_use,
                "Derivation to use is undefined which is needed to run this test",
            ).toBeDefined();
            derivation_to_use = derivation_to_use as derivation;

            const all_records = await derivations_dao.getAll();

            expect(all_records).toBeDefined();
            expect(Array.isArray(all_records)).toBeTrue();
            expect(all_records.length).toBeGreaterThanOrEqual(1);
            expect(z.array(derivations_schema).safeParse(all_records).success).toBeTrue();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect getById() to behave normaly and returned value to adhere to schema`,
        async () => {
            expect(
                derivation_to_use,
                "Derivation to use is undefined which is needed to run this test",
            ).toBeDefined();
            derivation_to_use = derivation_to_use as derivation;

            const record_by_id = await derivations_dao.getById(derivation_to_use.id);
            expect(record_by_id).toBeDefined();
            expect(record_by_id).not.toBeNull();
            expect(derivations_schema.safeParse(record_by_id).success).toBeTrue();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect an Edit to work and that edit be reflected in the database`,
        async () => {
            expect(
                derivation_to_use,
                "Derivation to use is undefined which is needed to run this test",
            ).toBeDefined();
            derivation_to_use = derivation_to_use as derivation;

            const updated_record = await derivations_dao.update({
                ...derivation_to_use,
                cnarhash: "something new",
                compression: "zstd",
                cfilesize: 20,
            });

            expect(updated_record).toBeDefined();
            expect(derivations_schema.safeParse(updated_record).success).toBeTrue();

            const actual_record_in_database = await derivations_dao.getById(derivation_to_use.id);
            expect(actual_record_in_database).toBeDefined();
            expect(actual_record_in_database).not.toBeNull();
            expect(derivations_schema.safeParse(actual_record_in_database).success).toBeTrue();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect a deletion to work and be reflected in the database`,
        async () => {
            expect(
                derivation_to_use,
                "Derivation to use is undefined which is needed to run this test",
            ).toBeDefined();
            derivation_to_use = derivation_to_use as derivation;

            const current_db_state = await derivations_dao.getById(derivation_to_use.id);
            expect(current_db_state).toBeDefined();
            expect(current_db_state).not.toBeNull();
            expect(derivations_schema.safeParse(current_db_state).success).toBeTrue();

            await derivations_dao.delete(derivation_to_use);

            const db_state_after_deletion = await derivations_dao.getById(derivation_to_use.id);
            expect(db_state_after_deletion).toBeDefined();
            expect(db_state_after_deletion).toBeNull();
        },
    );
}

Logger.setLogLevel("WARN");
await setupDatabase("SQLite");
await test_derivations_table(new sqlite_derivations(), "SQLite");
await test_derivations_table(new Derivations(), "Facade");
