import {Table} from "./Table.ts";
import type {cache_config as cache_config_type} from "@iglu-sh/types/core/db";
import type {QueryResult} from "pg";
export class cache_config extends Table {
    private data: cache_config_type[] = [];
    public async getData():Promise<cache_config_type[]> {
        return this.data
    }
    public async getById(id:string):Promise<cache_config_type> {
        const entry = this.data.find((bl) => bl.id === id)
        if(!entry){
            throw new Error(`Build Log with id ${id} not found`)
        }
        return entry
    }
    public async init(): Promise<void> {
        this.data = await this.query(`
            SELECT * FROM cache.cache_config 
        `).then((res)=>{
            return res.rows as cache_config_type[]
        })
    }
    public async createNewEntry(newEntry: cache_config_type):Promise<QueryResult<cache_config_type>> {
        return await this.query(`
            INSERT INTO cache.cache_config(key, value) VALUES ($1, $2)
        `, [newEntry.key, newEntry.value])
    }
}
