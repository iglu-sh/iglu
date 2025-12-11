import {Table} from "./Table.ts";
import type {
    cache_api_key_link,
    cache_api_key_link as cache_api_key_link_type,
    cache_api_key_link_raw
} from "@iglu-sh/types/core/db";
import type {QueryResult} from "pg";
export class Cache_api_key_link extends Table {
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

    public async getByApiKeyId(apiKeyId:string):Promise<cache_api_key_link_type[]> {
        return this.data.filter((link)=>link.api_key.id === apiKeyId)
    }

    public async getByCacheId(cacheId:string):Promise<cache_api_key_link_type[]> {
        return this.data.filter((link)=>link.cache.id === cacheId)
    }

    public override async createNewEntry(newEntry:cache_api_key_link):Promise<QueryResult<cache_api_key_link_raw>>{
        return await this.query(`
            INSERT INTO cache.cache_api_key_link(cache, api_key) VALUES ($1, $2) RETURNING *;
        `, [newEntry.cache.id, newEntry.api_key.id])
    }
    public override async modifyEntry(entry:cache_api_key_link):Promise<QueryResult<cache_api_key_link_raw>> {
        return await this.query(`
            UPDATE cache.cache_api_key_link SET cache = $1, api_key = $2 WHERE id = $3 RETURNING *;
        `, [entry.cache.id, entry.api_key.id, entry.id])
    }
}