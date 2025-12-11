import {Table} from "./Table.ts";
import type {
    cache_user_link as cache_user_link_type
} from "@iglu-sh/types/core/db";
export class cache_user_link extends Table {
    private data: cache_user_link_type[] = [];
    public async getData():Promise<cache_user_link_type[]> {
        return this.data
    }
    public async getById(id:string):Promise<cache_user_link_type> {
        const entry = this.data.find((bl) => bl.id === id)
        if(!entry){
            throw new Error(`Build Log with id ${id} not found`)
        }
        return entry
    }
    public async init(): Promise<void> {
        this.data = await this.query(`
            SELECT cul.id, row_to_json(c.*) as cache, row_to_json(u.*) as "user" FROM cache.cache_user_link cul
                INNER JOIN cache.cache c ON  cul.cache = c.id
                INNER JOIN cache."user" u ON cul."user" = u.id;
        `).then((res)=>{
            return res.rows as cache_user_link_type[]
        })
    }
}
