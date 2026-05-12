import { expect, test } from "bun:test";
import z from "zod";
import type { api_key } from "@/db_types";
import Logger from "@/logger";
import type { api_key_abstract } from "../../../shared/db/DAO/abstracts/api_key_abstract";
import { Api_keys } from "../../../shared/db/DAO/api_key";
import type { SupportedDatabasesString } from "../../../shared/db/DAO/DAO";
import sqlite_api_keys from "../../../shared/db/DAO/sqlite/api_keys";
import { hashApiKey } from "../../../shared/utils/crypto/api_key_generation";
import { api_keys_schema } from "../../../shared/utils/zod/zod_db_schemas";
import { setupDatabase } from "./utils";
/**
 * @description Runs tests for a given agent dao
 * @param {agent_abstract} api_key_dao The dao you want to test
 * @param {SupportedDatabasesString | 'Facade'} db_type The type of dao you are testing, this doesn't have an effect beyond test descriptions
 * */
export async function test_api_keys_table(
    api_key_dao: api_key_abstract,
    db_type: SupportedDatabasesString | "Facade",
) {
    const table_name = "Api_keys";
    let api_key_to_use: api_key | undefined;
    test.serial(
        `${db_type} (DAO, ${table_name}): Expect an insert to work properly, produce one api key and have the correct zod format`,
        async () => {
            const inserted_api_key = await api_key_dao.insert({
                id: "n/a",
                hash: hashApiKey(
                    "I love thinking of random things to put here, I think I should just be the random string generator for every api key we generate",
                ),
                name: "test api key",
            });

            expect(inserted_api_key).toBeDefined();
            expect(inserted_api_key).not.toBeNull();
            expect(inserted_api_key.id).not.toBe("n/a");
            expect(api_keys_schema.safeParse(inserted_api_key).success).toBeTrue();
            api_key_to_use = inserted_api_key;
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect get all to produce an array of only api_keys that is at least one api key long`,
        async () => {
            expect(api_key_to_use).toBeDefined();
            api_key_to_use = api_key_to_use as api_key;

            const all_api_keys = await api_key_dao.getAll();

            expect(all_api_keys).toBeDefined();
            expect(all_api_keys).not.toBeNull();
            expect(Array.isArray(all_api_keys)).toBeTrue();
            expect(all_api_keys.length).toBeGreaterThanOrEqual(1);
            expect(z.array(api_keys_schema).safeParse(all_api_keys).success).toBeTrue();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect get by ID to produce one record of the correct schema`,
        async () => {
            expect(api_key_to_use).toBeDefined();
            api_key_to_use = api_key_to_use as api_key;

            const api_key_by_id = await api_key_dao.getById(api_key_to_use.id);

            expect(api_key_by_id).toBeDefined();
            expect(api_key_by_id).not.toBeNull();
            expect(api_keys_schema.safeParse(api_key_by_id).success).toBeTrue();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect get by Hash to produce one record of the correct schema`,
        async () => {
            expect(api_key_to_use).toBeDefined();
            api_key_to_use = api_key_to_use as api_key;

            const api_key_by_hash = await api_key_dao.getByHash(api_key_to_use.hash);

            expect(api_key_by_hash).toBeDefined();
            expect(api_key_by_hash).not.toBeNull();
            expect(api_keys_schema.safeParse(api_key_by_hash).success).toBeTrue();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect a key to actually be updated when calling update`,
        async () => {
            expect(api_key_to_use).toBeDefined();
            api_key_to_use = api_key_to_use as api_key;
            const updated_key = await api_key_dao.update({
                ...api_key_to_use,
                name: "Testing_key",
            });

            expect(updated_key).toBeDefined();

            let updated_key_from_db = await api_key_dao.getById(api_key_to_use.id);

            expect(updated_key_from_db).toBeDefined();
            expect(updated_key_from_db).not.toBeNull();
            expect(api_keys_schema.safeParse(updated_key_from_db).success).toBeTrue();
            updated_key_from_db = updated_key_from_db as api_key;
            expect(updated_key_from_db.name).toBe("Testing_key");
            expect(updated_key.name).toBe(updated_key_from_db.name);
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect a delete to actually delete an api key`,
        async () => {
            expect(api_key_to_use).toBeDefined();
            api_key_to_use = api_key_to_use as api_key;

            await api_key_dao.delete(api_key_to_use);
            const deleted_key = await api_key_dao.getById(api_key_to_use.id);

            expect(deleted_key).toBeDefined();
            expect(deleted_key).toBeNull();
        },
    );
}

await test_api_keys_table(new sqlite_api_keys(), "SQLite");
await test_api_keys_table(new Api_keys(), "Facade");
