import type { upload } from "@/db_types";
import { DAO } from "./DAO";
import { sqlite_uploads } from "./sqlite/uploads";
import Logger from "@/logger";

export default class Uploads extends DAO<upload> {
    private type = DAO.getType();

    /**
     * @description Insert a temporary upload into the uploads table and get it back
     * @param {upload} item
     * @returns {Promise<upload>}
     * @throws {Error} if nothing was inserted or more than one was inserted
     * */
    public override async insert(item: upload): Promise<upload> {
        let return_item: upload | undefined;

        if (this.type === "SQLite") {
            return_item = await new sqlite_uploads().insert(item);
        }

        if (!return_item) {
            Logger.error(
                "Panic(DB::DAO::uploads): Could not insert into uploads table! (Did not receive return value from DAO)",
            );
            throw new Error(
                "Panic(DB::DAO::uploads): Could not insert into uploads table! (Did not receive return value from DAO)",
            );
        }

        return return_item;
    }

    /**
     * @description Get everything from the uploads table
     * @returns {Promise<Array<upload>>}
     * */
    public override async getAll(): Promise<upload[]> {
        let return_item: Array<upload> | undefined;

        if (this.type === "SQLite") {
            return_item = await new sqlite_uploads().getAll();
        }

        if (!return_item) {
            Logger.error(
                "Panic(DB::DAO::uploads): Could not get all from uploads table! (Did not receive return value from DAO)",
            );
            throw new Error(
                "Panic(DB::DAO::uploads): Could not get all from uploads table! (Did not receive return value from DAO)",
            );
        }
        return return_item;
    }

    /**
     * @description Gets a specific upload from the uploads table
     * @param {string} id - The ID of the upload
     * @returns {Promise<upload|null>}
     * */
    public override async getById(id: string): Promise<upload | null> {
        let return_item: upload | null = null;

        if (this.type === "SQLite") {
            return_item = await new sqlite_uploads().getById(id);
        }

        return return_item;
    }

    /**
     * @description Delete a specific record from the uploads table
     * @param {upload} item - The ID of the upload
     * @returns {Promise<void>}
     * */
    public override async delete(item: upload): Promise<void> {
        if (this.type === "SQLite") {
            await new sqlite_uploads().delete(item.id);
        }
    }

    /**
     * @description Wipes the entire uploads table
     * @returns {Promise<void>}
     * */
    public async wipe(): Promise<void> {
        if (this.type === "SQLite") {
            await new sqlite_uploads().wipe();
        }
    }

    /**
     * @description Updates an upload
     * @param {upload} item - The new record
     * @returns {Promise<upload>}
     * @throws {Error} - If nothing was returned from DAO
     * */
    public override async update(item: upload): Promise<upload> {
        let return_item: upload | undefined;

        if (this.type === "SQLite") {
            return_item = await new sqlite_uploads().update(item);
        }

        if (!return_item) {
            Logger.error(
                "Panic(DB::DAO::uploads): Could not update uploads table! (Did not receive return value from DAO)",
            );
            throw new Error(
                "Panic(DB::DAO::uploads): Could not update uploads table! (Did not receive return value from DAO)",
            );
        }

        return return_item;
    }
}
