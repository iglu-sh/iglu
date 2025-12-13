import {Table} from "./Table.ts";
import type {git_config as table_type} from "@iglu-sh/types/core/db";
export class git_config extends Table {
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
            SELECT gc.id, gc.repository, gc.branch, gc.gitusername, gc.gitkey, gc.requiresauth, gc.noclone,
                   (
                       SELECT
                           json_build_object(
                                   'id', b.id,
                                   'cache', row_to_json(bc.*),
                                   'name', b.name,
                                   'description', b.description,
                                   'enabled', b.enabled,
                                   'trigger', b.trigger,
                                   'cron', b.cron,
                                   'created_at', b.created_at,
                                   'updated_at', b.updated_at,
                                   'arch', b.arch,
                                   'webhookurl', b.webhookurl)
                       FROM cache.builder b
                                INNER JOIN cache.cache bc ON b.cache = bc.id
                       WHERE b.id = gc.builder
                   ) as builder
            FROM cache.git_config gc
        `).then((res)=>{
            return res.rows as table_type[]
        })
    }
}
