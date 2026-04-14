import SQLiteConnector from "../../Connectors/SQLite";
import type {access_rule} from '@/db_types'
import { access_rules } from "../../schema_sqlite";
import Logger from '@/logger'
export default class sqlite_access_rules {
    private db = new SQLiteConnector().getDB(); 
    
    /**
     * @description Inserts a record into the tenants table
     * @param {access_rules} item - The access rule to be inserted into the table (ID is ignore but should be in your object for API consistency in your object)
     * @returns {Promise<access_rule>} - The created rule
     * @throws {Error} - If inserting fails or nothing is returned from the database
    * */
    public async insert(item:access_rule):Promise<access_rule>{
        const rule: typeof access_rules.$inferInsert = {
            ...item,
            id: undefined
        }
        const inserted_items = await this.db.insert(access_rules).values(rule).returning()
        if(inserted_items.length === 0 || !inserted_items[0]){
            Logger.error('Panic(DB::DAO::access_rules::sqlite_access_rules): Could not insert into access_rules table! (Unknown Error)')
            throw new Error('Panic(DB::DAO::access_rules::sqlite_access_rules): Could not insert into access_rules table?')
        } 

        return inserted_items[0]
    }
}
