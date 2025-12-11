import {Table} from "./Table.ts";
import type {api_key as api_key_type, api_key_raw} from "@iglu-sh/types/core/db";
import type {QueryResult} from "pg";
export class api_key extends Table {
    private data: api_key_type[] = [];
    public async getData():Promise<api_key_type[]> {
        return this.data
    }
    public async getById(id:string):Promise<api_key_type>{
        return  this.data.find((item)=>item.id === id) as api_key_type
    }

    public async init(): Promise<void> {
        await this.getData()
        this.data = await this.query(`
            SELECT ak.id, ak.name, ak.hash, ak.description, ak.created_at, ak.last_used, row_to_json(u.*) as "user" FROM cache.api_key ak
                INNER JOIN cache.user u ON ak.user = u.id;
        `)
            .then((res)=>{
                return res.rows as api_key_type[]
            })
    }

    public async createNewEntry(newEntry:api_key_type): Promise<QueryResult<api_key_raw>> {
        return await this.query(`
            INSERT INTO cache.api_key (name, hash, description, "user", last_used)
            VALUES ($1, $2, $3, $4, now())
            RETURNING *;
        `, [newEntry.name, newEntry.hash, newEntry.description, newEntry.user.id])
    }
}