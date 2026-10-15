/**
 * Regression tests for configuration / database setup (see BUGS.md #11, #12)
 * These are expected to FAIL until the corresponding bug is fixed.
 *
 * Note: tests/shared/daos/utils.ts enables `PRAGMA foreign_keys = ON` itself, which is why
 * the regular test suite never noticed that production connections run without it.
 * */
import type { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import SQLiteConnector from "@/shared/db/Connectors/SQLite";
import { Configuration } from "@/shared/utils/cache/Configuration";

describe("BUGS.md #11: SQLite foreign keys", () => {
    test("connections created by SQLiteConnector enforce foreign keys", () => {
        const connector_static = SQLiteConnector as unknown as { db: unknown };
        const original_db = connector_static.db;
        const database_config = Configuration.getConfig().database;
        const original_location = database_config.database_file_location;

        fs.mkdirSync("/tmp/iglu-regression", { recursive: true });
        const db_file = `/tmp/iglu-regression/fk-${Bun.randomUUIDv7()}.sqlite`;
        let foreign_keys: number | undefined;
        try {
            // Force the connector to open a fresh connection like it does in production
            connector_static.db = undefined;
            database_config.database_file_location = db_file;
            const db = new SQLiteConnector().getDB();
            const row = (db.$client as Database).query("PRAGMA foreign_keys").get() as {
                foreign_keys: number;
            };
            foreign_keys = row.foreign_keys;
            (db.$client as Database).close();
        } finally {
            connector_static.db = original_db;
            database_config.database_file_location = original_location;
            fs.rmSync(db_file, { force: true });
        }
        expect(foreign_keys).toBe(1);
    });
});

describe("BUGS.md #12: relative database_file_location", () => {
    test.each([
        ["/tmp/iglu-cwd"],
        ["/tmp/iglu-cwd/"],
    ])("a relative path is resolved inside IGLU_CWD=%p", (cwd) => {
        const original_config = Configuration.getConfig();
        const original_cwd = process.env.IGLU_CWD;
        let resolved: string | undefined;
        try {
            process.env.IGLU_CWD = cwd;
            new Configuration({
                ...original_config,
                database: {
                    ...original_config.database,
                    database_file_location: "out.sqlite",
                },
            });
            resolved = Configuration.getConfig().database.database_file_location;
        } finally {
            Configuration.setConfig(original_config);
            if (original_cwd === undefined) {
                delete process.env.IGLU_CWD;
            } else {
                process.env.IGLU_CWD = original_cwd;
            }
        }
        expect(resolved).toBe("/tmp/iglu-cwd/out.sqlite");
    });
});
