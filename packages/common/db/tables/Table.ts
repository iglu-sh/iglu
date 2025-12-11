import {db} from "../index.ts";
import type {QueryResult} from "pg";

export abstract class Table {
    private client:db.Database
    constructor(client:db.Database) {
        this.client = client
    }
    protected async query(query:string, params:Array<unknown> = [], user?:string){
        return this.client.query(query, params, user)
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
    *
    * */
    public abstract createNewEntry(newEntry:unknown, ...links:Array<unknown>):Promise<unknown>
}