import {DAO} from "./DAO"
import type { api_key_tenant_link } from "@/db_types";
import Logger from "@/logger";
import sqlite_api_key_tenant_link from "./sqlite/api_key_tenant_link";

export class Api_keys_tenants_link extends DAO<api_key_tenant_link>{
    private type = DAO.getType()

    /**
     * @description Insert into the api_key_tenant_link table
     * @param {api_key_tenant_link} item - The Record to insert 
     * @return {Promise<api_key_tenant_link>}
     * @throws {Error} If there wasn't anything inserted or more than one record was inserted
     * */
    public override async insert(item: api_key_tenant_link): Promise<api_key_tenant_link> {
        let return_item:api_key_tenant_link|undefined;

        if(this.type === 'SQLite'){
            return_item = await new sqlite_api_key_tenant_link().insert(item)
        }

        if(!return_item){
            Logger.error(
                "Panic(DB::DAO::api_key_tenant_link): Could not insert into api_key_tenant_link table! (Did not get anything from DAO)",
            )
            throw new Error(
                "Panic(DB::DAO::api_key_tenant_link): Could not insert into api_key_tenant_link table! (Did not get anything from DAO)",
            )
        }

        return return_item
    }

    /**
     * @description Get every record from the api_key_tenant_link table
     * @returns {Promise<Array<api_key_tenant_link>>}
    * */
    public override async getAll(): Promise<api_key_tenant_link[]> {
        let return_item:Array<api_key_tenant_link>|undefined;

        if(this.type === 'SQLite'){
            return_item = await new sqlite_api_key_tenant_link().getAll()
        }

        if(!return_item){
            Logger.error(
                "Panic(DB::DAO::api_key_tenant_link): Could not get everything from api_key_tenant_link table! (Did not get anything from DAO)",
            )
            throw new Error(
                "Panic(DB::DAO::api_key_tenant_link): Could not get everything from api_key_tenant_link table! (Did not get anything from DAO)",
            )
        }

        return return_item
    }

    /**
     * @description Get a specific record (by ID) from the api_key_tenant_link table
     * @param {string} id - The ID of the record you are trying to access
     * @returns {Promise<api_key_tenant_link | null>}
     * @throws {Error} If there's more than one record with the same ID
     * */
    public override async getById(id: string): Promise<api_key_tenant_link | null> {
        let return_item:api_key_tenant_link|null = null;

        if(this.type === 'SQLite'){
            return_item = await new sqlite_api_key_tenant_link().getById(id)
        }

        return return_item
    }

    /**
     * @description Deletes a specified record from the table
     * @param {api_key_tenant_link} item - This is the ID of the record you want to delete
     * @returns {Promise<void>}
     * */
    public override async delete(item: api_key_tenant_link): Promise<void> {
        if(this.type === 'SQLite'){
            await new sqlite_api_key_tenant_link().delete(item.id)
        }
    }

    /**
     * @description Updates a record to a new state
     * @param {api_key_tenant_link} item The record to update
     * @returns {Promise<api_key_tenant_link>}
     * @throws {Error} If more than one record was updated
     * */
    public override async update(item: api_key_tenant_link): Promise<api_key_tenant_link> {
        let return_item:api_key_tenant_link|undefined;

        if(this.type === 'SQLite'){
            await new sqlite_api_key_tenant_link().update(item)
        }

        if(!return_item){
            Logger.error(
                "Panic(DB::DAO::api_key_tenant_link): Could not update api_key_tenant_link table! (Did not get anything from DAO)",
            )
            throw new Error(
                "Panic(DB::DAO::api_key_tenant_link): Could not update api_key_tenant_link table! (Did not get anything from DAO)",
            )
        }

        return return_item
    }
}
