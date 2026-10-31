import { Logger } from "@iglu-sh/shared/logger";
import type { database_version } from "@iglu-sh/shared/types";
import type { database_versions_abstract } from "./abstracts/database_versions";
import { DAO } from "./DAO";
import { postgres_database_versions } from "./postgres/database_versions";
import { sqlite_database_versions } from "./sqlite/database_versions";
export class Database_Versions implements database_versions_abstract {
    private dao: database_versions_abstract = ((): database_versions_abstract => {
        let return_class: database_versions_abstract | undefined;
        if (DAO.getType() === "SQLite") {
            return_class = new sqlite_database_versions();
        }
        if (DAO.getType() === "Postgres") {
            return_class = new postgres_database_versions();
        }

        if (!return_class) {
            Logger.error(
                "panic(DAO::database_versions): Did not receive valid DAO. Is the Database type supported?",
            );
            throw new Error(
                "panic(DAO::database_versions): Did not receive valid DAO. Is the Database type supported?",
            );
        }

        return return_class;
    })();

    /**
     * @description Inserts a record into the database_versions table
     * @param {database_version} item - The new database_version
     * @returns {Promise<database_version>} The created version
     * @throws {Error} If inserting fails or nothing is returned from the database
     * */
    public async insert(item: database_version): Promise<database_version> {
        return await this.dao.insert(item);
    }

    /**
     * @description Gets all the records of the database_versions table and returns them in an array
     * @returns {Promise<Array<database_version>>}
     * */
    public async getAll(): Promise<database_version[]> {
        return await this.dao.getAll();
    }

    /**
     * @description Attempts to find a record in the tenants table associated with the given ID
     * @param {string} id - The ID of the record you are trying to access
     * @returns {Promise<database_version|null>}
     * @throws {Error} - If there's more than one record associated with the provided ID or the database version schema is mangled
     * */
    public async getById(id: string): Promise<database_version | null> {
        return await this.dao.getById(id);
    }

    /**
     * @description Fetches the latest Database version
     * @returns {Promise<database_version|null>}
     * @throws {Error} If the datbase version schema is mangled
     * */
    public async get_latest(): Promise<database_version | null> {
        return await this.dao.get_latest();
    }

    /**
     * @description Deletes a database version
     * @param {database_version} to_delete The version to delete
     * @returns {Promise<void>}
     * */
    public async delete(to_delete: database_version): Promise<void> {
        return this.dao.delete(to_delete);
    }

    /**
     * @description Updates a given record (comparing by ID) to a new state given in the same object
     * @param {database_version} to_update
     * @returns {Promise<database_version>} - The new state
     * @throws {Error} - In case nothing was updated, an invalid schema was returned or more than one record was updated
     * */
    public async update(to_update: database_version): Promise<database_version> {
        return this.dao.update(to_update);
    }
}
