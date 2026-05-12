import { expect, test } from "bun:test";
import z from "zod";
import type { derivation_tenant_link } from "@/db_types";
import Logger from "@/logger";
import type { derivation_tenant_links_abstract } from "../../../shared/db/DAO/abstracts/derivation_tenant_links_abstract";
import { Api_keys } from "../../../shared/db/DAO/api_key";
import type { SupportedDatabasesString } from "../../../shared/db/DAO/DAO";
import { Derivations } from "../../../shared/db/DAO/derivation";
import { Derivation_tenant_link } from "../../../shared/db/DAO/derivation_tenant_link";
import { Signing_Keys } from "../../../shared/db/DAO/signing_keys";
import sqlite_derivation_tenant_link from "../../../shared/db/DAO/sqlite/derivation_tenant_links";
import { Tenants } from "../../../shared/db/DAO/tenants";
import { hashApiKey } from "../../../shared/utils/crypto/api_key_generation";
import { derivations_tenants_links_schema } from "../../../shared/utils/zod/zod_db_schemas";
import { setupDatabase } from "./utils";

/**
 * @description Runs tests for a given derivations dao
 * @param {derivation_tenant_links_abstract} links_dao The dao you want to test
 * @param {SupportedDatabasesString | 'Facade'} db_type The type of dao you are testing, this doesn't have an effect beyond test descriptions
 * */
export async function test_derivations_tenants_links_table(
    links_dao: derivation_tenant_links_abstract,
    db_type: SupportedDatabasesString | "Facade",
) {
    const table_name = "Derivations_tenants_links";

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

    const derivation_to_use = await new Derivations().insert({
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

    let link_to_use: derivation_tenant_link | undefined;

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect insert() to behave normaly and returned value to adhere to schema`,
        async () => {
            expect(tenant_to_use).toBeDefined();
            expect(api_key_to_use).toBeDefined();
            expect(signing_key_to_use).toBeDefined();
            expect(derivation_to_use).toBeDefined();

            const inserted_link = await links_dao.insert({
                id: "n/a",
                derivations_id: derivation_to_use,
                tenants_id: tenant_to_use,
            });

            expect(inserted_link).toBeDefined();
            expect(inserted_link.id).not.toBe("n/a");
            expect(derivations_tenants_links_schema.safeParse(inserted_link).success).toBeTrue();
            link_to_use = inserted_link;
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect getAll() to behave normaly, return at least one value and returned value to adhere to schema`,
        async () => {
            expect(link_to_use).toBeDefined();
            link_to_use = link_to_use as derivation_tenant_link;

            const all_links = await links_dao.getAll();

            expect(all_links).toBeDefined();
            expect(Array.isArray(all_links)).toBeTrue();
            expect(all_links.length).toBeGreaterThanOrEqual(1);
            expect(
                z.array(derivations_tenants_links_schema).safeParse(all_links).success,
            ).toBeTrue();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect getById() to behave normaly and returned value to adhere to schema`,
        async () => {
            expect(link_to_use).toBeDefined();
            link_to_use = link_to_use as derivation_tenant_link;

            const link_by_id = await links_dao.getById(link_to_use.id);
            expect(link_by_id).toBeDefined();
            expect(link_by_id).not.toBeNull();
            expect(derivations_tenants_links_schema.safeParse(link_by_id).success).toBeTrue();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect getByNixStoreHashes() to behave normaly, return at least one value and returned value to adhere to schema`,
        async () => {
            expect(link_to_use).toBeDefined();
            link_to_use = link_to_use as derivation_tenant_link;

            const links_in_db = await links_dao.getByNixStoreHashes(
                ["test", "nonexistent_link_hash", "another one"],
                tenant_to_use.id,
            );

            expect(links_in_db).toBeDefined();
            expect(Array.isArray(links_in_db)).toBeTrue();
            expect(links_in_db.length).toBe(1);
            expect(
                z.array(derivations_tenants_links_schema).safeParse(links_in_db).success,
            ).toBeTrue();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect update() to behave normaly and returned value to adhere to schema`,
        async () => {
            expect(link_to_use).toBeDefined();
            link_to_use = link_to_use as derivation_tenant_link;

            const derivation_to_update_to = await new Derivations().insert({
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

            const updated_link = await links_dao.update({
                ...link_to_use,
                derivations_id: derivation_to_update_to,
            });

            expect(updated_link).toBeDefined();
            expect(updated_link).not.toBeNull();
            expect(derivations_tenants_links_schema.safeParse(updated_link).success).toBeTrue();

            const record_in_db = await links_dao.getById(updated_link.id);
            expect(record_in_db).toBeDefined();
            expect(record_in_db).not.toBeNull();
            expect(derivations_tenants_links_schema.safeParse(record_in_db).success).toBeTrue();
            expect(record_in_db?.derivations_id.id).toBe(derivation_to_update_to.id);

            await links_dao.update({
                ...link_to_use,
                derivations_id: derivation_to_use,
            });
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect delete() to behave normaly and the record to disappear from the database`,
        async () => {
            expect(link_to_use).toBeDefined();
            link_to_use = link_to_use as derivation_tenant_link;

            await links_dao.delete(link_to_use);

            const link_in_db = await links_dao.getById(link_to_use.id);

            expect(link_in_db).toBeDefined();
            expect(link_in_db).toBeNull();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect a deletion of a tenant to also delete the link between derivation and tenant`,
        async () => {
            const link = await links_dao.insert({
                id: "n/a",
                tenants_id: tenant_to_use,
                derivations_id: derivation_to_use,
            });

            const link_in_db = await links_dao.getById(link.id);

            expect(link_in_db).toBeDefined();
            expect(link_in_db).not.toBeNull();
            expect(derivations_tenants_links_schema.safeParse(link_in_db).success).toBeTrue();

            await new Tenants().delete(tenant_to_use);

            const link_in_db_after_tenant_deletion = await links_dao.getById(link.id);

            expect(link_in_db_after_tenant_deletion).toBeDefined();
            expect(link_in_db_after_tenant_deletion).toBeNull();
            expect(
                derivations_tenants_links_schema.safeParse(link_in_db_after_tenant_deletion)
                    .success,
            ).toBeFalse();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect a deletion of a derivation to also delete the link between derivation and tenant`,
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

            const link = await links_dao.insert({
                id: "n/a",
                tenants_id: tenant_to_use,
                derivations_id: derivation_to_use,
            });

            const link_in_db = await links_dao.getById(link.id);

            expect(link_in_db).toBeDefined();
            expect(link_in_db).not.toBeNull();
            expect(derivations_tenants_links_schema.safeParse(link_in_db).success).toBeTrue();

            await new Derivations().delete(derivation_to_use);

            const link_in_db_after_tenant_deletion = await links_dao.getById(link.id);

            expect(link_in_db_after_tenant_deletion).toBeDefined();
            expect(link_in_db_after_tenant_deletion).toBeNull();
            expect(
                derivations_tenants_links_schema.safeParse(link_in_db_after_tenant_deletion)
                    .success,
            ).toBeFalse();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect an insert referring to a non-existant derivation to fail`,
        async () => {
            expect(derivation_to_use).toBeDefined();
            expect(link_to_use).toBeDefined();
            link_to_use = link_to_use as derivation_tenant_link;
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

            const derivation = await new Derivations().insert({
                ...derivation_to_use,
            });

            let insert_did_throw = false;
            try {
                await links_dao.insert({
                    id: "n/a",
                    tenants_id: tenant,
                    derivations_id: {
                        ...derivation,
                        id: "non-existant",
                    },
                });
            } catch (e) {
                Logger.debug(`Received expected error in insert: ${e}`);
                insert_did_throw = true;
            }

            expect(insert_did_throw).toBeTrue();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect an insert referring to a non-existant tenant to fail`,
        async () => {
            expect(derivation_to_use).toBeDefined();
            expect(link_to_use).toBeDefined();
            link_to_use = link_to_use as derivation_tenant_link;
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

            const derivation = await new Derivations().insert({
                ...derivation_to_use,
            });

            let insert_did_throw = false;
            try {
                await links_dao.insert({
                    id: "n/a",
                    tenants_id: {
                        ...tenant,
                        id: "non-existant-tenant",
                    },
                    derivations_id: derivation,
                });
            } catch (e) {
                Logger.debug(`Received expected error in insert: ${e}`);
                insert_did_throw = true;
            }

            expect(insert_did_throw).toBeTrue();
        },
    );
}

await test_derivations_tenants_links_table(new sqlite_derivation_tenant_link(), "SQLite");
await test_derivations_tenants_links_table(new Derivation_tenant_link(), "Facade");
