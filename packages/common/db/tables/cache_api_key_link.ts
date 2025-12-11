import {Table} from "./Table.ts";
import type {cache_api_key_link as cache_api_key_link_type} from "@iglu-sh/types/core/db";
export class cache_api_key_link extends Table {
    private data: cache_api_key_link_type[] = [];
    public async getData():Promise<cache_api_key_link_type[]> {
        return this.data
    }
    public async getById(id:string):Promise<cache_api_key_link_type> {
        const entry = this.data.find((bl) => bl.id === id)
        if(!entry){
            throw new Error(`Build Log with id ${id} not found`)
        }
        return entry
    }
    public async init(): Promise<void> {
        this.data = await this.query(`
            SELECT cakl.id,
                   json_build_object(
                           'id', ak.id,
                           'user', row_to_json(u.*),
                           'name', ak.name,
                           'hash', ak.hash,
                           'description', ak.description,
                           'created_at', ak.created_at,
                           'last_used', ak.last_used
                   ) as api_key,
                   row_to_json(c.*) as cache
            FROM cache.cache_api_key_link cakl
                     INNER JOIN cache.cache c ON cakl.cache = c.id
                     INNER JOIN cache.api_key ak ON cakl.api_key = ak.id
                     INNER JOIN cache.user u ON ak."user" = u.id
        `).then((res)=>{
            return res.rows as cache_api_key_link_type[]
        })
    }
}