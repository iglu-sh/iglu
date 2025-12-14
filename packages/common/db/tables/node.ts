import {Table} from "./Table.ts";
import type {node as table_type} from "@iglu-sh/types/core/db";
export class node extends Table {
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
            SELECT n.id, n.name, row_to_json(nc.*) as config, address, port, n.version, arch, os, max_jobs, auth_token FROM cache.node n
                INNER JOIN cache.node_config nc ON n.config = nc.id
        `).then((res)=>{
            return res.rows as table_type[]
        })
    }
}
