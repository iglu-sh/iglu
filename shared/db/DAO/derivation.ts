import Logger from "../../logger/Logger";
import type { derivation } from "../../types/schema";
import type { derivations_abstract } from "./abstracts/derivations_abstract";
import { DAO, type SupportedDatabasesString } from "./DAO";
import sqlite_derivations from "./sqlite/derivations";

export class Derivations implements derivations_abstract {
    type: SupportedDatabasesString = DAO.getType();
    private dao: derivations_abstract = ((): derivations_abstract => {
        let return_class: derivations_abstract | undefined;
        if (DAO.getType() === "SQLite") {
            return_class = new sqlite_derivations();
        }

        if (!return_class) {
            Logger.error(
                "panic(DAO::derivations): Did not receive valid DAO. Is the Database type supported?",
            );
            throw new Error(
                "panic(DAO::derivations): Did not receive valid DAO. Is the Database type supported?",
            );
        }

        return return_class;
    })();
    /**
     * @description Inserts a new record into the derivations table
     * @param {derivation} item The derivation to insert
     * @returns {Promise<derivation>}
     * @throws {Error} - If nothing was inserted or more than one was inserted
     * */
    public async insert(item: derivation): Promise<derivation> {
        Logger.debug(`Inserting Derivation with cnarhash: ${item.cnarhash}`);
        return await this.dao.insert(item);
    }

    /**
     * @description Returns **every** record in the derivations table (this table can be pretty large so use this with caution)
     * @returns {Promise<Array<derivation>>}
     * */
    public async getAll(): Promise<Array<derivation>> {
        Logger.debug(`Accessing every record from the Derivations table`);
        return await this.dao.getAll();
    }

    /**
     * @description Returns a derivation matched  by the given ID
     * @param {string} id - The ID of the derivation
     * @returns {Promise<derivation | null>}
     * @throws {Error}
     * */
    public async getById(id: string): Promise<derivation | null> {
        Logger.debug(`Fetching Derivation with ID: ${id}`);
        return await this.dao.getById(id);
    }

    /**
     * @description deletes a record via given ID
     * @param {derivation} item - The ID of the record to delete
     * @returns {Promise<void>}
     * */
    public async delete(item: derivation): Promise<void> {
        Logger.debug(`Deleting derivation with ID: ${item.id}`);
        await this.dao.delete(item);
    }

    /**
     * @description Updates a record to a new state given in the to_update param. Matched via the ID in the to_update field
     * @param {derivation} to_update
     * @returns {Promise<derivation>}
     * @throws {Error} - Incase nothing was updated or more than one record was updated
     * */
    public async update(to_update: derivation): Promise<derivation> {
        Logger.debug(`Updating derivation with ID: ${to_update.id}`);
        return await this.dao.update(to_update);
    }
}
