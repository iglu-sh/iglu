import {Table} from "./Table.ts";
import type {cache as cache_type} from "@iglu-sh/types/core/db";
import type {QueryResult} from "pg";
export class Cache extends Table {
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

    public override async createNewEntry(newEntry: cache_type): Promise<QueryResult<cache_type>> {
        return await this.query(`
            INSERT INTO cache.cache(githubusername, ispublic, name, permission, preferredcompressionmethod, uri, priority) VALUES 
                ($1, $2, $3, $4, $5, $6, $7)
        `, [newEntry.githubusername, newEntry.ispublic, newEntry.name, newEntry.permission, newEntry.preferredcompressionmethod, newEntry.uri, newEntry.priority])
    }

    public override async modifyEntry(updatedEntry:cache_type): Promise<QueryResult<cache_type>> {
        return await this.query(`
            UPDATE cache.cache SET
                githubusername = $1,
                ispublic = $2,
                name = $3,
                permission = $4,
                preferredcompressionmethod = $5,
                uri = $6,
                priority = $7
            WHERE id = $8
        `, [updatedEntry.githubusername, updatedEntry.ispublic, updatedEntry.name, updatedEntry.permission, updatedEntry.preferredcompressionmethod, updatedEntry.uri, updatedEntry.priority, updatedEntry.id])
    }
}