import SQLiteConnector from "../../Connectors/SQLite";

export default class sqlite_tenants {
    private db = new SQLiteConnector().getDB();

    /**
     * @description Inserts a record into the tenants table
     * @param {tenant} item - The tenant data to be inserted (ID is ignored but should be kept for API consistency in your object. In this case, ID may be an empty string)
     * @returns {Promise<tenant>} - The created tenant
     * @throws {Error} - If inserting fails or nothing is returned from the database
     * */
    public async insert(item: tenant): Promise<tenant> {}

    /**
     * @description Gets all the records of the tenants table and returns them in an array
     * @returns {Promise<Array<tenant>>}
     * */
    public async getAll(): Promise<Array<tenant>> {}

    /**
     * @description Attempts to find a record in the tenants table associated with the given ID
     * @param {string} id - The ID of the record you are trying to access
     * @returns {Promise<tenant | null>}
     * @throws {Error} - If there's more than one record with the associated ID
     * */
    public async getById(id: string): Promise<tenant | null> {}

    /**
     * @description Deletes a tenant. Only the ID field in this tenant object is really required, everything else should be fine to leave out (or empty strings)
     * @param {tenant} to_delete - The tenant object which contains the ID of the record to delete
     * @returns {Promise<void>}
     * */
    public async delete(to_delete: tenant) {}

    /**
     * @description Updates a given record (comparing by ID) to a new state given in the same object.
     * @param {tenant} to_update - The object containing the ID and the new values for that ID
     * @returns {tenant} - The updated tenant
     * @throws {Error} - In case nothing was updated, or more than one record was updated
     * */
    public async update(to_update: tenant) {}
}
