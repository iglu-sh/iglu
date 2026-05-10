import { expect, test } from "bun:test";
import z from "zod";
import type { request } from "@/db_types";
import Logger from "@/logger";
import type { requests_abstract } from "../../../shared/db/DAO/abstracts/requests_asbtract";
import { Api_keys } from "../../../shared/db/DAO/api_key";
import type { SupportedDatabasesString } from "../../../shared/db/DAO/DAO";
import { Derivations } from "../../../shared/db/DAO/derivation";
import { Derivation_tenant_link } from "../../../shared/db/DAO/derivation_tenant_link";
import { Requests } from "../../../shared/db/DAO/request";
import { Signing_Keys } from "../../../shared/db/DAO/signing_keys";
import sqlite_requests from "../../../shared/db/DAO/sqlite/requests";
import { Tenants } from "../../../shared/db/DAO/tenants";
import { hashApiKey } from "../../../shared/utils/crypto/api_key_generation";
import { requests_schema } from "../../../shared/utils/zod/zod_db_schemas";

/**
 * @description Runs tests for a given requests dao
 * @param {requests_abstract} requests_dao The dao you want to test
 * @param {SupportedDatabasesString | 'Facade'} db_type The type of dao you are testing, this doesn't have an effect beyond test descriptions
 * */
export async function test_requests_table(
    requests_dao: requests_abstract,
    db_type: SupportedDatabasesString | "Facade",
) {
    const table_name = "Requests";

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

    const link_to_use = await new Derivation_tenant_link().insert({
        id: "n/a",
        tenants_id: tenant_to_use,
        derivations_id: derivation_to_use,
    });

    let request_to_use: request | undefined;

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect insert() to behave normaly and returned value to adhere to schema`,
        async () => {
            expect(tenant_to_use).toBeDefined();
            expect(api_key_to_use).toBeDefined();
            expect(signing_key_to_use).toBeDefined();
            expect(derivation_to_use).toBeDefined();
            expect(link_to_use).toBeDefined();

            const inserted_request = await requests_dao.insert({
                id: "n/a",
                derivations_tenants_links: link_to_use.id,
                direction: "inbound",
                date: 0,
                url: "/api/v1/nonexistent_test",
            });

            expect(inserted_request).toBeDefined();
            expect(inserted_request).not.toBeNull();
            expect(requests_schema.safeParse(inserted_request).success).toBeTrue();
            expect(inserted_request.id).not.toBe("n/a");
            request_to_use = inserted_request;
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect getAll() to behave normaly, get back at least one record and returned value to adhere to schema`,
        async () => {
            expect(request_to_use).toBeDefined();
            request_to_use = request_to_use as request;

            const all_requests = await requests_dao.getAll();

            expect(all_requests).toBeDefined();
            expect(Array.isArray(all_requests)).toBeTrue();
            expect(all_requests.length).toBeGreaterThanOrEqual(1);
            expect(z.array(requests_schema).safeParse(all_requests).success).toBeTrue();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect getById() to behave normaly and returned value to adhere to schema`,
        async () => {
            expect(request_to_use).toBeDefined();
            request_to_use = request_to_use as request;

            const request_by_id = await requests_dao.getById(request_to_use.id);

            expect(request_by_id).toBeDefined();
            expect(request_by_id).not.toBeNull();
            expect(requests_schema.safeParse(request_by_id).success).toBeTrue();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect getLatestRequestForLink() to behave normally and returned value to adhere to schema`,
        async () => {
            expect(request_to_use).toBeDefined();
            request_to_use = request_to_use as request;

            const second_request = await requests_dao.insert({
                id: "n/a",
                derivations_tenants_links: link_to_use.id,
                direction: "outbound",
                date: 10,
                url: "/api/v1/nonexistent_test",
            });

            expect(second_request).toBeDefined();
            expect(second_request.id).not.toBe("n/a");
            expect(requests_schema.safeParse(second_request).success).toBeTrue();

            await requests_dao.update({
                ...second_request,
                date: Date.now() + 100,
            });

            const latest = await requests_dao.getLatestRequestForLink(link_to_use.id);

            expect(latest).toBeDefined();
            expect(latest).not.toBeNull();
            expect(requests_schema.safeParse(latest).success).toBeTrue();
            expect(latest?.id).toBe(second_request.id);
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect update() to behave normally and returned value to adhere to schema`,
        async () => {
            expect(request_to_use).toBeDefined();
            request_to_use = request_to_use as request;

            const updated_record = await requests_dao.update({
                ...request_to_use,
                direction: "outbound",
                url: "/api/v1/another_one",
            });

            expect(updated_record).toBeDefined();
            expect(updated_record).not.toBeNull();
            expect(updated_record.id).toBe(request_to_use.id);
            expect(updated_record.direction).toBe("outbound");
            expect(updated_record.url).toBe("/api/v1/another_one");
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect delete() to behave normally and record to be actually deleted from database`,
        async () => {
            expect(request_to_use).toBeDefined();
            request_to_use = request_to_use as request;

            const record_in_db = await requests_dao.getById(request_to_use.id);
            expect(record_in_db).toBeDefined();
            expect(record_in_db).not.toBeNull();
            expect(requests_schema.safeParse(record_in_db).success).toBeTrue();

            await requests_dao.delete(request_to_use);

            const record_in_db_after_deletion = await requests_dao.getById(request_to_use.id);
            expect(record_in_db_after_deletion).toBeDefined();
            expect(record_in_db_after_deletion).toBeNull();
            expect(requests_schema.safeParse(record_in_db_after_deletion).success).toBeFalse();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect bulkInsert() to behave normally`,
        async () => {
            const requests: Array<request> = [];
            for (let i = 0; i < 100; i++) {
                requests.push({
                    id: "n/a",
                    derivations_tenants_links: link_to_use.id,
                    direction: Math.random() > 0.5 ? "outbound" : "inbound",
                    date: Date.now(),
                    url: Bun.randomUUIDv7(),
                });
            }

            expect(requests.length).toBe(100);

            await requests_dao.bulk_insert(requests);

            const all_requests = await requests_dao.getAll();

            expect(all_requests).toBeDefined();
            expect(Array.isArray(all_requests)).toBeTrue();
            expect(all_requests.length).toBeGreaterThanOrEqual(100);
            expect(z.array(requests_schema).safeParse(all_requests).success).toBeTrue();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect removeForLink() to behave normally`,
        async () => {
            const inserted_record = await requests_dao.insert({
                id: "n/a",
                derivations_tenants_links: link_to_use.id,
                direction: "outbound",
                date: 0,
                url: Bun.randomUUIDv7(),
            });

            expect(inserted_record).toBeDefined();
            expect(inserted_record).not.toBeNull();

            await requests_dao.removeAllForLink(link_to_use.id);

            const record_in_db = await requests_dao.getById(inserted_record.id);
            expect(record_in_db).toBeDefined();
            expect(record_in_db).toBeNull();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect the deletion of a derivation tenant link record to result in the deletion of all requets associated with it`,
        async () => {
            const inserted_record = await requests_dao.insert({
                id: "n/a",
                derivations_tenants_links: link_to_use.id,
                direction: "outbound",
                date: 0,
                url: Bun.randomUUIDv7(),
            });

            expect(inserted_record).toBeDefined();
            expect(inserted_record).not.toBeNull();

            await new Derivation_tenant_link().delete(link_to_use);

            const record_in_db = await requests_dao.getById(inserted_record.id);
            expect(record_in_db).toBeDefined();
            expect(record_in_db).toBeNull();
        },
    );

    test.serial(
        `${db_type} (DAO, ${table_name}): Expect an insert referring to an non-existant link entry to fail`,
        async () => {
            expect(derivation_to_use).toBeDefined();
            expect(request_to_use).toBeDefined();
            request_to_use = request_to_use as request;

            let insert_did_throw = false;
            try {
                await requests_dao.insert({
                    ...request_to_use,
                    derivations_tenants_links: "non-existant-derivation",
                });
            } catch (e) {
                Logger.debug(`Received expected error: ${e}`);
                insert_did_throw = true;
            }

            expect(insert_did_throw).toBeTrue();
        },
    );
}

await test_requests_table(new sqlite_requests(), "SQLite");
await test_requests_table(new Requests(), "Facade");
