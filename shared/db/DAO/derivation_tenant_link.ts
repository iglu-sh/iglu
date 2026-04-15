import {DAO} from './DAO'
import Logger from '@/logger';
import type { derivation_tenant_link } from "@/db_types";
import sqlite_derivation_tenant_link from './sqlite/derivation_tenant_links';

export default class Derivation_tenant_link extends DAO<derivation_tenant_link>{
    private type = DAO.getType()
    /**
     * @description inserts a new record into the derivation_tenant_link
     * @param {derivation_tenant_link} item - The Record to insert
     * @returns {Promise<derivation_tenant_link>}
     * @throws {Error} If nothing got inserted, or more than one record was inserted 
    * */
    public override async insert(item: derivation_tenant_link): Promise<derivation_tenant_link> {
        let return_item:derivation_tenant_link|undefined;
        if(this.type === 'SQLite'){
            return_item = await new sqlite_derivation_tenant_link().insert(item)
        }

        if(!return_item){
            Logger.error(
                'Panic(DB::DAO::derivation_tenant_link): Could not insert into derivation_tenant_link table (Did not get returning value from DAO)'
            )
            throw new Error(
                'Panic(DB::DAO::derivation_tenant_link): Could not insert into derivation_tenant_link table (Did not get returning value from DAO)'
            )
        }

        return return_item
    }


    /**
     * @description returns **every** record in the derivations table (this table can be very long so use this with caution)
     * @returns {Promise<Array<derivation_tenant_link>>}
     * @throws {Error} if nothing is returned by DAO
    * */
    public override async getAll(): Promise<derivation_tenant_link[]> {
        let returning_array:Array<derivation_tenant_link>|undefined; 

        if(this.type === 'SQLite'){
            returning_array = await new sqlite_derivation_tenant_link().getAll()
        }

        if(!returning_array){
            Logger.error(
                'Panic(DB::DAO::derivation_tenant_link): Could not get from derivation_tenant_link table (Did not get returning value from DAO)'
            )
            throw new Error(
                'Panic(DB::DAO::derivation_tenant_link): Could not get from derivation_tenant_link table (Did not get returning value from DAO)'
            )
        }

        return returning_array;
    }

    /**
     * @description returns a derivation link record via given ID
     * @param {string} id - The ID of the record
     * @returns {Promise<derivation_tenant_link | null>}
     * @throws - If more than one record is returned
    * */
    public override async getById(id: string): Promise<derivation_tenant_link | null> {
        let return_item:derivation_tenant_link|null = null;
        if(this.type === 'SQLite'){
            return_item = await new sqlite_derivation_tenant_link().getById(id) 
        }

        return return_item;
    }

    /**
     * @description Deletes a specified link record
     * @param {derivation_tenant_link} item - The Record to delete
     * @returns {Promise<void>}
     * */
    public override async delete(item: derivation_tenant_link): Promise<void> {
        if(this.type === 'SQLite'){
            await new sqlite_derivation_tenant_link().delete(item.id)
        }      
    } 

    /**
     * @description Updates a given record to a new state, ignoring nested objects (except the ID field in those)
     * @param {derivation_tenant_link} item - The Record to Update
     * @returns {Promise<derivation_tenant_link}
     * @throws {Error} - If nothing got updated or more than one record was updated, or the DAO didn't return anything
     * */
    public override async update(item: derivation_tenant_link): Promise<derivation_tenant_link> {
        let return_item:derivation_tenant_link|undefined;

        if(this.type === 'SQLite'){
            return_item = await new sqlite_derivation_tenant_link().update(item)
        }

        if(!return_item){
            Logger.error(
                'Panic(DB::DAO::derivation_tenant_link): Could not update derivation_tenant_link table (Did not get returning value from DAO)'
            )
            throw new Error(
                'Panic(DB::DAO::derivation_tenant_link): Could not update derivation_tenant_link table (Did not get returning value from DAO)'
            )
        }

        return return_item
    }
}
