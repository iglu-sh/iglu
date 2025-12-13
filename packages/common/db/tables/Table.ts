import {db} from "../index.ts";
import type {QueryResult} from "pg";

export abstract class Table {
    private client:db.Database
    constructor(client:db.Database) {
        this.client = client
    }
    protected async query(query:string, params:Array<unknown> = [], user?:string){
        if(this.client.getType() == 'static'){
            return await db.StaticDatabase.query(query, params, user)
        }
        return await this.client.query(query, params, user)
    }
    protected getClient():db.Database{
        return this.client
    }
    /*
    * Initialize the table (e.g., fetch the data)
    * */
    public abstract init():Promise<void>
    /*
    * Get the data from the table based on the type
    * */
    public abstract getData():Promise<unknown>

    /*
    * Get a single record by its ID
    * */
    public abstract getById(id:string):Promise<unknown>

    /*
    * Create a new entry in the table
    * @param newEntry The new entry to create
    * @param links optional linked entries to associate with the new entry
    * */
    public abstract createNewEntry(newEntry:unknown, ...links:Array<unknown>):Promise<unknown>

    /*
    * Modify an existing entry in the table
    * */
    public abstract modifyEntry(updatedEntry:unknown):Promise<unknown>

    /*
    * Delete a record by its ID
    * @param id The ID of the record to delete
    * */
    public abstract deleteById(id:string):Promise<void>
}
