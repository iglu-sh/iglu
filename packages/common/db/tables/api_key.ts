import {Table} from "./Table.ts";
import type {api_key as api_key_type} from "@iglu-sh/types/core/db";
export class api_key extends Table {
    private data: api_key_type[] = [];
    public async getData():Promise<api_key_type[]> {
        return this.data
    }


    public async init(): Promise<void> {
        await this.connect()
        await this.getData()
        this.data = await this.query(`
            SELECT * FROM cache.api_key; 
        `)
            .then((res)=>{

            })
        await this.disconnect()
    }
}