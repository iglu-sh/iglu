import {Table} from "./Table.ts";
import type {public_signing_key as table_type} from "@iglu-sh/types/core/db";
export class public_signing_key extends Table {
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
            SELECT
                json_build_object(
                        'id', psk.id,
                        'api_key',json_build_object(
                                'id', ak_psk.id,
                                'user', row_to_json(u_psk),
                                'name', ak_psk.name,
                                'hash', ak_psk.hash,
                                'description', ak_psk.description,
                                'created_at', ak_psk.created_at,
                                'last_used', ak_psk.last_used
                                  ),
                        'name', psk.name,
                        'public_key', psk.public_signing_key,
                        'description', psk.description,
                        'created_at', psk.created_at
                )
            FROM cache.public_signing_key psk
                     INNER JOIN cache.api_key ak_psk ON psk.api_key = ak_psk.id
                     INNER JOIN cache.user u_psk ON ak_psk."user" = u_psk.id 
        `).then((res)=>{
            return res.rows as table_type[]
        })
        await this.disconnect()
    }
}
