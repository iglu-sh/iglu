import type { derivation } from "@/db_types";
import { DAO, type SupportedDatabasesString } from './DAO'
import sqlite_derivations from "./sqlite/derivations";
import Logger from "@/logger";

export default class Derivations extends DAO<derivation>{
    type: SupportedDatabasesString = DAO.getType()

    /**
     * @description Inserts a new record into the derivations table
     * @param {derivation} - The derivation to insert
     * @returns {Promise<derivation>}
     * @throws {Error} - If nothing was inserted or more than one was inserted
    * */      
    public override async insert(item: derivation): Promise<derivation> {
        Logger.debug(`Inserting Derivation with cnarhash: ${item.cnarhash}`)
        let return_item:derivation|undefined;
        if (this.type === 'SQLite'){
            return_item = await new sqlite_derivations().insert(item)
        }

        if(!return_item){
            Logger.error(
                "Panic(DB::DAO::derivations): Could not insert into derivations table! (Did not get return value)",
            );
            throw new Error(
                "Panic(DB::DAO::derivations): Could not insert into derivations table! (Did not get return value)",
            );
        }

        return return_item
    } 

    /**
     * @description Returns **every** record in the derivations table (this table can be pretty large so use this with caution)
     * @returns {Promise<Array<derivation>>}
     * */
    public override async getAll():Promise<Array<derivation>>{
        Logger.debug(`Accessing every record from the Derivations table`)
        let return_item:Array<derivation>|undefined;
        if(this.type === 'SQLite'){
            return_item = await new sqlite_derivations().getAll()
        }

        if(!return_item){
            Logger.error(
                "Panic(DB::DAO::derivations): Could not get all derivations (Did not get return value from sub-dao)",
            );
            throw new Error(
                "Panic(DB::DAO::derivations): Could not get all derivations (Did not get return value from sub-dao)",
            );
        }

        return return_item;
    }

     
    /**
     * @description Returns a derivation matched  by the given ID
     * @param {string} id - The ID of the derivation
     * @returns {Promise<derivation | null>}
     * @throws {Error}
     * */
    public override async getById(id: string): Promise<derivation | null> {
        Logger.debug(`Fetching Derivation with ID: ${id}`)  
        let return_item: derivation | null = null;
        if(this.type === 'SQLite'){
            return_item = await new sqlite_derivations().getById(id)
        }

        return return_item;
    }

    /**
     * @description deletes a record via given ID
     * @param {derivation} item - The ID of the record to delete
     * @returns {Promise<void>}
     * */
    public override async delete(item: derivation): Promise<void> {
        Logger.debug(`Deleting derivation with ID: ${item.id}`)
        await new sqlite_derivations().delete(item.id)  
    }


    /**
     * @description Updates a record to a new state given in the to_update param. Matched via the ID in the to_update field
     * @param {derivation} to_update 
     * @returns {Promise<derivation>}
     * @throws {Error} - Incase nothing was updated or more than one record was updated
     * */
    public override async update(to_update: derivation): Promise<derivation> {
        Logger.debug(`Updating derivation with ID: ${to_update.id}`)
        let return_item:derivation|undefined 

        if(this.type === 'SQLite'){
            return_item = await new sqlite_derivations().update(to_update)
        }

        if(!return_item){
            Logger.error(
                "Panic(DB::DAO::derivations): Could not update Record (did not get return value)",
            );
            throw new Error(
                "Panic(DB::DAO::derivations): Could not update Record (did not get return value)",
            );
        }

        return return_item;
    }
}
