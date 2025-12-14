import {Table} from "./Table.ts";
import type {cache as cache_type} from "@iglu-sh/types/core/db";
import type {QueryResult} from "pg";
export class Cache extends Table {
    private data: cache_type[] = [];
    private queryString:string = `
        SELECT
            c.*
        FROM cache.cache c 
    `
    public async getData():Promise<cache_type[]> {
        return this.data
    }
    public async getById(id:string):Promise<cache_type> {
        const entry = await this.query(this.queryString + `WHERE c.id = $1`, [id]).then((res)=>{
            return res.rows[0] as cache_type | undefined
        })
        if(!entry){
            throw new Error(`Build Log with id ${id} not found`)
        }
        return entry
    }
    public async getByName(name:string):Promise<cache_type> {
        const entry = await this.query(this.queryString + `WHERE c.name = $1`, [name]).then((res)=>{
            return res.rows[0] as cache_type | undefined
        })
        if(!entry){
            throw new Error(`Cache with name ${name} not found`)
        }
        return entry
    }
    public async init(): Promise<void> {
        this.data = await this.query(this.queryString).then((res)=>{
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