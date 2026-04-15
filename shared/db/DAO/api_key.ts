import { DAO } from "./DAO";
import type { api_key } from "@/db_types";
import sqlite_api_keys from "./sqlite/api_keys";
import Logger from "@/logger";

export default class Api_keys extends DAO<api_key>{
    private type = DAO.getType()

    /**
     * @description Inserts a new record into the tenants table
     * @param {api_key} item - The record to into the table
     * @returns {Promise<api_key>} 
     * @throws {Error} If nothing is inserted or more than one record is inserted
    * */
    public override async insert(item: api_key): Promise<api_key> {
        let return_item:api_key|undefined;

        if(this.type === 'SQLite'){
            return_item = await new sqlite_api_keys().insert(item)
        }

        if(!return_item){
            Logger.error(
                "Panic(DB::DAO::requests): Could not insert into api_key table! (Did not get anything from DAO)",
            )
            throw new Error(
                "Panic(DB::DAO::requests): Could not insert into api_key table! (Did not get anything from DAO)",
            )
        }
        return return_item
    }

    /**
     * @description Gets every record from the tenants table
     * @returns {Promise<Array<api_key>>}
     * @throws {Error} if DAO returns nothing
    * */
    public override async getAll(): Promise<api_key[]> {
        let return_item:Array<api_key> | undefined;

        if(this.type === 'SQLite'){
            return_item = await new sqlite_api_keys().getAll()
        }

        if(!return_item){
            Logger.error(
                "Panic(DB::DAO::requests): Could not get everything from api_key table! (Did not get anything from DAO)",
            )
            throw new Error(
                "Panic(DB::DAO::requests): Could not get everything from api_key table! (Did not get anything from DAO)",
            )
        }

        return return_item;
    }

    /**
     * @description Get by ID
     * @param {string} id The ID of the record you are trying to access
     * @returns {Promise<api_key|null>}
     * @throws {Error} If there's more than one record with the given ID
    * */
    public override async getById(id: string): Promise<api_key | null> {
        let return_item:api_key | null = null;

        if(this.type === 'SQLite'){
            return_item = await new sqlite_api_keys().getById(id)
        }

        return return_item
    }

    /**
     * @description Deletes an api_key.
     * @param {string} to_delete - The ID you are trying to delete
     * @returns{Promise<void>}
     * */
    public override async delete(item: api_key): Promise<void> {
        if(this.type === 'SQLite'){
            await new sqlite_api_keys().delete(item.id)
        }
    }

    /**
     * @description Updates an api_key
     * @param {string} to_update - The record you are trying to update
     * @returns {api_key}
     * @throws {Error}
    * */
    public override async update(item: api_key): Promise<api_key> {
        let return_item:api_key | undefined;

        if(this.type === 'SQLite'){
            return_item = await new sqlite_api_keys().update(item)
        }

        if(!return_item){
            Logger.error(
                "Panic(DB::DAO::requests): Could not update api_key table! (Did not get anything from DAO)",
            )
            throw new Error(
                "Panic(DB::DAO::requests): Could not update api_key table! (Did not get anything from DAO)",
            )
        }

        return return_item
    }
}
