import type { upload } from "@/db_types";
import Logger from "@/logger";
import type { uploads_abstract } from "./abstracts/uploads_abstract";
import { DAO } from "./DAO";
import { sqlite_uploads } from "./sqlite/uploads";

export class Uploads implements uploads_abstract {
    private dao: uploads_abstract = ((): uploads_abstract => {
        let return_class: uploads_abstract | undefined;
        if (DAO.getType() === "SQLite") {
            return_class = new sqlite_uploads();
        }

        if (!return_class) {
            Logger.error(
                "panic(DAO::uploads): Did not receive valid DAO. Is the Database type supported?",
            );
            throw new Error(
                "panic(DAO::uploads): Did not receive valid DAO. Is the Database type supported?",
            );
        }

        return return_class;
    })();

    /**
     * @description Insert a temporary upload into the uploads table and get it back
     * @param {upload} item
     * @returns {Promise<upload>}
     * @throws {Error} if nothing was inserted or more than one was inserted
     * */
    public async insert(item: upload): Promise<upload> {
        return await this.dao.insert(item);
    }

    /**
     * @description Get everything from the uploads table
     * @returns {Promise<Array<upload>>}
     * */
    public async getAll(): Promise<upload[]> {
        return await this.dao.getAll();
    }

    /**
     * @description Gets a specific upload from the uploads table
     * @param {string} id - The ID of the upload
     * @returns {Promise<upload|null>}
     * */
    public async getById(id: string): Promise<upload | null> {
        return await this.dao.getById(id);
    }

    /**
     * @description Delete a specific record from the uploads table
     * @param {upload} item - The ID of the upload
     * @returns {Promise<void>}
     * */
    public async delete(item: upload): Promise<void> {
        await this.dao.delete(item);
    }

    /**
     * @description Wipes the entire uploads table
     * @returns {Promise<void>}
     * */
    public async wipe(): Promise<void> {
        await this.dao.wipe();
    }

    /**
     * @description Updates an upload
     * @param {upload} item - The new record
     * @returns {Promise<upload>}
     * @throws {Error} - If nothing was returned from DAO
     * */
    public async update(item: upload): Promise<upload> {
        return await this.dao.update(item);
    }
}
