import { desc, eq } from "drizzle-orm";
import z from "zod";
import { Logger } from "@/shared/logger";
import type { database_version } from "@/shared/types";
import { database_version_schema } from "@/shared/utils/zod/zod_config_schema";
import PostgresConnector from "../../Connectors/Postgres";
import { database_versions } from "../../schema_pg";
import type { database_versions_abstract } from "../abstracts/database_versions";

export class postgres_database_versions implements database_versions_abstract {
    private db = new PostgresConnector().getDB();

    /**
     * @description Inserts a record into the database_versions table
     * @param {database_version} item - The new database_version
     * @returns {Promise<database_version>} The created version
     * @throws {Error} If inserting fails or nothing is returned from the database
     * */
    public async insert(item: database_version): Promise<database_version> {
        const inserted_items = await this.db.insert(database_versions).values(item).returning();

        const verified_schema = database_version_schema.safeParse(inserted_items);

        if (!verified_schema.success) {
            Logger.error(
                `bug(database_version::postgres_database_versions): Unable to verify database version schema while inserting: Either the provided schema was invalid or the database mangled the record.`,
            );
            throw new Error(
                `bug(database_version::postgres_database_versions): Unable to verify database version schema while inserting: Either the provided schema was invalid or the database mangled the record.`,
            );
        }

        return verified_schema.data;
    }

    /**
     * @description Gets all the records of the database_versions table and returns them in an array
     * @returns {Promise<Array<database_version>>}
     * */
    public async getAll(): Promise<Array<database_version>> {
        const all_records = this.db.select().from(database_versions);
        const verified_output = z.array(database_version_schema).safeParse(all_records);

        if (!verified_output.success) {
            Logger.error(
                `bug(database_version::postgres_database_versions): Unable to verify database version schema while getting all records: Either the schemas were invalid or the database mangled the records.`,
            );

            // I know we usually do not throw during get operations, however in this case something is seriously wrong and it should be handled by the calling function
            throw new Error(
                `bug(database_version::postgres_database_versions): Unable to verify database version schema while getting all records: Either the schemas were invalid or the database mangled the records.`,
            );
        }

        return verified_output.data;
    }

    /**
     * @description Attempts to find a record in the tenants table associated with the given ID
     * @param {string} id - The ID of the record you are trying to access
     * @returns {Promise<database_version|null>}
     * @throws {Error} - If there's more than one record associated with the provided ID or the database version schema is mangled
     * */
    public async getById(id: string): Promise<database_version | null> {
        const db_data = await this.db
            .select()
            .from(database_versions)
            .where(eq(database_versions.id, parseInt(id, 10)));

        if (db_data.length > 1) {
            Logger.debug(
                `panic(database_version::postgres_database_versions): Found more than one record associated with the same id`,
            );
            throw new Error(
                `panic(database_version::postgres_database_versions): Found more than one record associated with the same id`,
            );
        }

        if (db_data.length === 0 || !db_data[0]) {
            return null;
        }

        const verified_output = database_version_schema.safeParse(db_data[0]);

        if (!verified_output.success) {
            Logger.error(
                `bug(database_version::postgres_database_versions): Unable to verify database version schema while getting by id: Either the schema coming from the database was invalid or the database mangled the record`,
            );
            throw new Error(
                `bug(database_version::postgres_database_versions): Unable to verify database version schema while getting by id: Either the schema coming from the database was invalid or the database mangled the record`,
            );
        }

        return verified_output.data;
    }

    /**
     * @description Fetches the latest Database version
     * @returns {Promise<database_version|null>}
     * @throws {Error} If the datbase version schema is mangled
     * */
    public async get_latest(): Promise<database_version | null> {
        const db_data = await this.db
            .select()
            .from(database_versions)
            .orderBy(desc(database_versions.id))
            .limit(1);

        if (db_data.length === 0 || !db_data[0]) {
            return null;
        }

        const verified_output = database_version_schema.safeParse(db_data[0]);

        if (!verified_output.success) {
            Logger.error(
                `bug(database_version::postgres_database_versions): Unable to verify database version schema while getting latest version: Either the schema coming from the database was invalid or the database mangled the record`,
            );
            throw new Error(
                `bug(database_version::postgres_database_versions): Unable to verify database version schema while getting latest version: Either the schema coming from the database was invalid or the database mangled the record`,
            );
        }

        return verified_output.data;
    }

    /**
     * @description Deletes a database version
     * @param {database_version} to_delete The version to delete
     * @returns {Promise<void>}
     * */
    public async delete(to_delete: database_version): Promise<void> {
        await this.db.delete(database_versions).where(eq(database_versions.id, to_delete.id));
    }

    /**
     * @description Updates a given record (comparing by ID) to a new state given in the same object
     * @param {database_version} to_update
     * @returns {Promise<database_version>} - The new state
     * @throws {Error} - In case nothing was updated, an invalid schema was returned or more than one record was updated
     * */
    public async update(to_update: database_version): Promise<database_version> {
        const updated_item = await this.db
            .update(database_versions)
            .set({
                state: to_update.state,
                meta: to_update.meta,
            })
            .where(eq(database_versions.id, to_update.id))
            .returning();

        if (updated_item.length === 0 || !updated_item[0]) {
            Logger.error(
                `bug(database_version::postgres_database_versions): Attempted to update nonexisting database_version record with ID: ${to_update.id}`,
            );
            throw new Error(
                `bug(database_version::postgres_database_versions): Attempted to update nonexisting database_version record with ID: ${to_update.id}`,
            );
        }

        if (updated_item.length > 1) {
            Logger.error(
                `panic(database_version::postgres_database_versions): Updated more than one record in an update statement`,
            );
            throw new Error(
                `panic(database_version::postgres_database_versions): Updated more than one record in an update statement`,
            );
        }

        const verified_schema = database_version_schema.safeParse(updated_item[0]);

        if (!verified_schema.success) {
            Logger.error(
                `bug(database_version::postgres_database_versions): Unable to verify returned schema from Database: Invalid Schema provided or database mangled the record`,
            );
            throw new Error(
                `bug(database_version::postgres_database_versions): Unable to verify returned schema from Database: Invalid Schema provided or database mangled the record`,
            );
        }

        return verified_schema.data;
    }
}
