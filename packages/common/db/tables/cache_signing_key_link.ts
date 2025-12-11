import {Table} from "./Table.ts";
import type {
    cache_signing_key_link as cache_signing_key_link_type
} from "@iglu-sh/types/core/db";
export class cache_signing_key extends Table {
    private data: cache_signing_key_link_type[] = [];
    public async getData():Promise<cache_signing_key_link_type[]> {
        return this.data
    }
    public async getById(id:string):Promise<cache_signing_key_link_type> {
        const entry = this.data.find((bl) => bl.id === id)
        if(!entry){
            throw new Error(`Build Log with id ${id} not found`)
        }
        return entry
    }
    public async init(): Promise<void> {
        await this.connect()
        this.data = await this.query(`
            SELECT cskl.id, row_to_json(c.*) as cache,
                   (
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
                       WHERE psk.id = cskl.public_signing_key
                   ) as signingkey
            FROM cache.cache_signing_key_link cskl
                     INNER JOIN cache.cache c ON c.id = cskl.cache
        `).then((res)=>{
            return res.rows as cache_signing_key_link_type[]
        })
        await this.disconnect()
    }
}