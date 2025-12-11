import {Table} from "./Table.ts";
import type {cache as cache_type} from "@iglu-sh/types/core/db";
export class cache extends Table {
    private data: cache_type[] = [];
    public async getData():Promise<cache_type[]> {
        return this.data
    }
    public async getById(id:string):Promise<cache_type> {
        const entry = this.data.find((bl) => bl.id === id)
        if(!entry){
            throw new Error(`Build Log with id ${id} not found`)
        }
        return entry
    }
    public async init(): Promise<void> {
        this.data = await this.query(`
            SELECT  
                c.*          
            FROM cache.cache c 
        `).then((res)=>{
            return res.rows as cache_type[]
        })
    }
}