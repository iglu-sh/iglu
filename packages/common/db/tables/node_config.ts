import {Table} from "./Table.ts";
import type {node_config as table_type} from "@iglu-sh/types/core/db";
export class node_config extends Table {
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
        this.data = await this.query(`
            SELECT * FROM cache.node_config 
        `).then((res)=>{
            return res.rows as table_type[]
        })
    }
}
