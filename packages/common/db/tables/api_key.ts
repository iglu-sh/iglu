import {Table} from "./Table.ts";
import type {api_key as api_key_type, api_key_raw, cache_api_key_link_raw, cache as cache_type} from "@iglu-sh/types/core/db";
import type {QueryResult} from "pg";
import {Cache_api_key_link} from "./cache_api_key_link.ts";
export class Api_key extends Table {
    private data: api_key_type[] = [];
    private queryString:string = `
        SELECT ak.id, ak.name, ak.hash, ak.description, ak.created_at, ak.last_used, row_to_json(u.*) as "user" FROM cache.api_key ak
            INNER JOIN cache.user u ON ak.user = u.id
    `
    public async getData():Promise<api_key_type[]> {
        return this.data
    }
    public async getById(id:string):Promise<api_key_type>{
        const entry = await this.query(this.queryString + `WHERE ak.id = $1`, [id]).then((res)=>{
            return res.rows[0] as api_key_type | undefined
        })
        if(!entry){
            throw new Error(`API Key with id ${id} not found`)
        }
        return entry
    }

    public async init(): Promise<void> {
        await this.getData()
        this.data = await this.query(this.queryString)
            .then((res)=>{
                return res.rows as api_key_type[]
            })
    }

    /*
    * Creates a new API key. **Important** Provide the plaintext key, it gets sha512 hashed here.
    * */
    public async createNewEntry(newEntry:api_key_type): Promise<QueryResult<api_key_raw>> {
        //Hash the key
        const hasher = new Bun.CryptoHasher("sha512");
        hasher.update(newEntry.hash)
        const hash = hasher.digest("hex")
        newEntry = {
            ...newEntry,
            hash: hash
        }
        return await this.query(`
            INSERT INTO cache.api_key (name, hash, description, "user", last_used)
            VALUES ($1, $2, $3, $4, now())
            RETURNING *;
        `, [newEntry.name, newEntry.hash, newEntry.description, newEntry.user.id])
    }

    public async modifyEntry(updatedEntry:api_key_type): Promise<QueryResult<api_key_raw>> {
        return await this.query(`
            UPDATE cache.api_key SET
                name = $1,
                hash = $2,
                description = $3,
                "user" = $4,
                last_used = $5
            WHERE id = $6
            RETURNING *;
        `, [updatedEntry.name, updatedEntry.hash, updatedEntry.description, updatedEntry.user.id, updatedEntry.last_used, updatedEntry.id])
    }

    public async createCacheKeyEntry(key:api_key_type, cache:cache_type): Promise<QueryResult<cache_api_key_link_raw>>{
        const key_link = new Cache_api_key_link(this.getClient())
        return await key_link.createNewEntry({
            id: "<empty>",
            api_key: key,
            cache: cache
        })
    }
    public async getByKey(plainTextKey:string):Promise<api_key_type>{
        //Hash the key
        const hasher = new Bun.CryptoHasher("sha512");
        hasher.update(plainTextKey)
        const hash = hasher.digest("hex")
        return await this.getByHash(hash)
    }
    public async getByHash(hash:string):Promise<api_key_type>{
        const entry = await this.query(this.queryString + `WHERE ak.hash = $1`, [hash]).then((res)=>{
            return res.rows[0] as api_key_type | undefined
        })
        if(!entry){
            throw new Error(`API Key with hash ${hash} not found`)
        }
        return entry
    }
}