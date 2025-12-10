import {Table} from "./Table.ts";
import type {build_config as build_config_type} from "@iglu-sh/types/core/db";
export class build_config extends Table {
    private data: build_config_type[] = [];
    public async getData():Promise<build_config_type[]> {
        return this.data
    }

    public async init(): Promise<void> {
        await this.connect()
        await this.getData()
        this.data = await this.query(`
            SELECT bc.id, bc.cores, bc.maxjobs, bc.keep_going, bc.extraargs,
        `)
            .then((res)=>{
                return res.rows as build_config_type[]
            })
        await this.disconnect()
    }
}
