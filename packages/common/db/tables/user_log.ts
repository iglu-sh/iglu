import {Table} from "./Table.ts";
import type {user_log as table_type} from "@iglu-sh/types/core/db";
export class user_log extends Table {
    private data: table_type[] = [];
    public async getData():Promise<table_type[]> {
        return this.data
    }
    public async getById(id:string):Promise<table_type> {
        const entry = this.data.find((bl) => bl.id === id)
        if(!entry){
            throw new Error(`Entry with id ${id} not found`)
        }
        return entry
    }
    public async init(): Promise<void> {
        await this.connect()
        this.data = await this.query(`
            SELECT ul.id, ul.time, ul.type, ul.data, row_to_json(u.*) as "user" FROM cache.user_log ul
               INNER JOIN cache."user" u ON ul."user" = u.id
        `).then((res)=>{
            return res.rows as table_type[]
        })
        await this.disconnect()
    }
}
