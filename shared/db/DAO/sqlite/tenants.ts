import SQLiteConnector from "../../Connectors/SQLite";
import { eq } from "drizzle-orm";
import type { tenant } from "@/db_types";
import { tenants } from "../../schema_sqlite";
import Logger from "@/logger";

interface tenant_with_id_undefined extends Omit<tenant, "id"> {
    id: string | undefined;
}

export default class sqlite_tenants {
    private db = new SQLiteConnector().getDB();

    /**
     * @description Inserts a record into the tenants table
     * @param {tenant} item - The tenant data to be inserted (ID is ignored but should be kept for API consistency in your object. In this case, ID may be an empty string)
     * @returns {Promise<tenant>} - The created tenant
     * @throws {Error} - If inserting fails or nothing is returned from the database
     * */
    public async insert(item: tenant): Promise<tenant> {
        const object_to_insert: tenant_with_id_undefined = item;
        object_to_insert.id = undefined;
        const tenant: typeof tenants.$inferInsert = object_to_insert;
        const inserted_items = await this.db.insert(tenants).values(tenant).returning();
        if (inserted_items.length === 0 || !inserted_items[0]) {
            Logger.error(
                "Panic(DB::DAO::tenants::sqlite_tenants): Could not insert into tenants table! (Unknown Error)",
            );
            throw new Error(
                "Panic(DB::DAO::tenants::sqlite_tenants): Could not insert into tenants table?",
            );
        }
        return inserted_items[0];
    }

    /**
     * @description Gets all the records of the tenants table and returns them in an array
     * @returns {Promise<Array<tenant>>}
     * */
    public async getAll(): Promise<Array<tenant>> {
        return await this.db.select().from(tenants);
    }

    /**
     * @description Attempts to find a record in the tenants table associated with the given ID
     * @param {string} id - The ID of the record you are trying to access
     * @returns {Promise<tenant | null>}
     * @throws {Error} - If there's more than one record with the associated ID
     * */
    public async getById(id: string): Promise<tenant | null> {
        const db_data = await this.db.select().from(tenants).where(eq(tenants.id, id));
        if (db_data.length > 1) {
            Logger.error(
                "Panic(DB::DAO::tenants::sqlite_tenants): Got more than one returned in getByID, I do not know what to do with this",
            );
            throw new Error(
                "Panic(DB::DAO::tenants::sqlite_tenants): Got more than one returned in getByID, I do not know what to do with this",
            );
        }

        if (db_data.length === 0 || !db_data[0]) {
            return null;
        }

        return db_data[0];
    }

    /**
     * @description Attempts to find a record using the name
     * @param {string} name - The name of the tenant
     * @returns {Promise<Array<tenant>>}
    * */
    public async getByName(name:string):Promise<Array<tenant>>{
        return await this.db.select().from(tenants).where(eq(tenants.name, name))
    }

    /**
     * @description Deletes a tenant. Only the ID field in this tenant object is really required, everything else should be fine to leave out (or empty strings)
     * @param {tenant} to_delete - The tenant object which contains the ID of the record to delete
     * @returns {Promise<void>}
     * */
    public async delete(to_delete: tenant) {
        await this.db.delete(tenants).where(eq(tenants.id, to_delete.id));
    }

    /**
     * @description Updates a given record (comparing by ID) to a new state given in the same object.
     * @param {tenant} to_update - The object containing the ID and the new values for that ID
     * @returns {tenant} - The updated tenant
     * @throws {Error} - In case nothing was updated, or more than one record was updated
     * */
    public async update(to_update: tenant) {
        const updated_item = await this.db
            .update(tenants)
            .set({
                github_username: to_update.github_username,
                is_public: to_update.is_public,
                name: to_update.name,
                permission: to_update.permission,
                preferred_compression_method: to_update.preferred_compression_method,
                uri: to_update.uri,
                priority: to_update.priority,
            })
            .where(eq(tenants.id, to_update.id))
            .returning();

        if (updated_item.length === 0 || !updated_item[0]) {
            Logger.error(
                "Panic(DB::DAO::tenants::sqlite_tenants): Did not get an updated item back from the tenants table",
            );
            throw new Error(
                "Panic(DB::DAO::tenants::sqlite_tenants): Did not get an updated item back from the tenants table",
            );
        }
        if (updated_item.length > 1) {
            Logger.error(
                "Panic(DB::DAO::tenants::sqlite_tenants): Updated more than one record, although it was compared by ID",
            );
            throw new Error(
                "Panic(DB::DAO::tenants::sqlite_tenants): Updated more than one record, although it was compared by ID",
            );
        }

        return updated_item[0];
    }
}
