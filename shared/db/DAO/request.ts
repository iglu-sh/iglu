import type { request } from "@/db_types"
import {DAO} from "./DAO"
import sqlite_requests from "./sqlite/requests";
import Logger from "@/logger";
export default class Requests extends DAO<request>{
    private type = DAO.getType()

    /**
     * @description Inserts a record into the requests Table
     * @param {request} item - The Record to insert
     * @returns {Promise<request>}
     * @throws {Error} If record could not be inserted or more than one record returned (somehow) from the insert function
    * */
    public override async insert(item: request): Promise<request> {
        let return_item:request | undefined;
        if(this.type === 'SQLite'){
            return_item = await new sqlite_requests().insert(item)
        }
        
        if(!return_item){
            Logger.error(
                "Panic(DB::DAO::requests): Could not insert into requests table! (Did not get anything from DAO)",
            )
            throw new Error(
                "Panic(DB::DAO::requests): Could not insert into requests table! (Did not get anything from DAO)",
            )
        }

        return return_item;
    }

    /**
     * @description Gets every record from the requests Table (very large be carefull)
     * @returns {Promise<Array<request>>}
    * */
    public override async getAll():Promise<Array<request>>{
        let return_item:Array<request> | undefined;
        
        if(this.type === 'SQLite'){
            return_item = await new sqlite_requests().getAll()
        }

        if(!return_item){
            Logger.error(
                "Panic(DB::DAO::requests): Could not get everything from requests table! (Did not get anything from DAO)",
            )
            throw new Error(
                "Panic(DB::DAO::requests): Could not get everything from requests table! (Did not get anything from DAO)",
            )
        }
        return return_item;
    }

    /**
     * @description Gets a specified request from the requests Table
     * @param {string} id - The ID of the request
     * @returns {Promise<request|null>} - Null in Case there wasn't anything to return
     * */
    public override async getById(id: string): Promise<request | null> {
        let return_item:request | null = null;

        if(this.type === 'SQLite'){
            return_item = await new sqlite_requests().getById(id)
        }

        return return_item
    }

    /**
     * @description Deletes a specified request
     * @param {request} item - The ID of the request
     * @returns {Promise<void>}
    * */
    public override async delete(item: request): Promise<void> {
        if(this.type === 'SQLite'){
            await new sqlite_requests().delete(item.id)
        } 
    }

    /**
     * @description Update a request
     * @param {request} item - The record you want to update
     * @returns {Promise<request>} The new state of the record you updated 
     * @throws {Error} - If nothing was updated or more than one record was updated
    * */
    public override async update(item: request): Promise<request> {
        let return_item:request | null = null;

        if(this.type === 'SQLite'){
            return_item = await new sqlite_requests().update(item)
        }

        if(!return_item){
            Logger.error(
                "Panic(DB::DAO::requests): Could not update requests table! (Did not get anything from DAO)",
            )
            throw new Error(
                "Panic(DB::DAO::requests): Could not update requests table! (Did not get anything from DAO)",
            )
        }

        return return_item;
    }
}
