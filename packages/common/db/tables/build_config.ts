import {Table} from "./Table.ts";
import type {build_config as build_config_type} from "@iglu-sh/types/core/db";
export class Build_config extends Table {
    private data: build_config_type[] = [];
    public async getData():Promise<build_config_type[]> {
        return this.data
    }
    public async getById(id:string):Promise<build_config_type> {
        const entry = this.data.find((bc) => bc.id === id)
        if(!entry){
            throw new Error(`Build Config with id ${id} not found`)
        }
        return entry
    }
    public async init(): Promise<void> {
        this.data = await this.query(`
            SELECT bc.id, cores, maxjobs, keep_going, extraaargs, substituters, parallelbuilds, command,
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
                   ) as builder
            FROM cache.build_config bc
                     INNER JOIN cache.builder b ON bc.builder = b.id
                     INNER JOIN cache.cache c ON b.cache = c.id;
        `)
            .then((res)=>{
                return res.rows as build_config_type[]
            })
    }
}
