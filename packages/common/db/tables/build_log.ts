import {Table} from "./Table.ts";
import type {build_log as build_log_type} from "@iglu-sh/types/core/db";
export class build_log extends Table {
    private data: build_log_type[] = [];
    public async getData():Promise<build_log_type[]> {
        return this.data
    }
    public async getById(id:string):Promise<build_log_type> {
        const entry = this.data.find((bl) => bl.id === id)
        if(!entry){
            throw new Error(`Build Log with id ${id} not found`)
        }
        return entry
    }
    public async init(): Promise<void> {
        await this.connect()
        this.data = await this.query(`
            SELECT  bl.*,
                json_build_object(
                        'id', b.id,
                        'cache', row_to_json(c.*),
                        'name', b.name,
                        'description', b.description,
                        'enabled', b.enabled,
                        'trigger', b.trigger,
                        'cron', b.cron,
                        'created_at', b.created_at,
                        'updated_at', b.updated_at,
                        'arch', b.arch,
                        'webhookurl', b.webhookurl
                ) as builder,
                json_build_object(
                        'id', n.id,
                        'config', row_to_json(nc.*),
                        'name', n.name,
                        'description', n.address,
                        'port', n.port,
                        'version', n.version,
                        'arch', n.arch,
                        'os', n.os,
                        'max_jobs', n.max_jobs,
                        'auth_token', n.auth_token
                ) as node
            FROM cache.build_log bl
                INNER JOIN cache.builder b ON bl.builder = b.id
                INNER JOIN cache.cache c ON b.cache = c.id
                INNER JOIN cache.node n ON bl.node = n.id
                INNER JOIN cache.node_config nc ON n.config = nc.id;
        `).then((res)=>{
            return res.rows as build_log_type[]
        })
        await this.disconnect()
    }
}