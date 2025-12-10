import {db} from "../index.ts";

export abstract class Table extends db.Database {

    /*
    * Initialize the table (e.g., fetch the data)
    * */
    public abstract init():Promise<void>
    /*
    * Get the data from the table based on the type
    * */
    public abstract getData():Promise<unknown>

}