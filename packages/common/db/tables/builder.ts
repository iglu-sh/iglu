import {Table} from "./Table.ts";
import type {builder as builder_type} from "@iglu-sh/types/core/db";
export class builder extends Table {
    private data: builder_type[] = [];
    public async getData():Promise<builder_type[]> {
        return this.data
    }
    public async getById(id:string):Promise<builder_type> {
        const entry = this.data.find((bl) => bl.id === id)
        if(!entry){
            throw new Error(`Build Log with id ${id} not found`)
        }
        return entry
    }
    public async init(): Promise<void> {
        await this.connect()
        this.data = await this.query(`
            SELECT  
                b.id, row_to_json(c.*) as cache, b.name, b.description, b.enabled, b.trigger, b.cron, b.created_at, b.updated_at, b.arch, b.webhookurl
            FROM cache.builder b
                INNER JOIN cache.cache c ON b.cache = c.id
        `).then((res)=>{
            return res.rows as builder_type[]
        })
        await this.disconnect()
    }
}