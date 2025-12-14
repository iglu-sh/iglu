import {Table} from "./Table.ts";
import type {cache_builder_key as cache_builder_key_type} from "@iglu-sh/types/core/db";
export class cache_builder_key extends Table {
    private data: cache_builder_key_type[] = [];
    public async getData():Promise<cache_builder_key_type[]> {
        return this.data
    }
    public async getById(id:string):Promise<cache_builder_key_type> {
        const entry = this.data.find((bl) => bl.id === id)
        if(!entry){
            throw new Error(`Build Log with id ${id} not found`)
        }
        return entry
    }
    public async init(): Promise<void> {
        this.data = await this.query(`
            SELECT row_to_json(c.*) as cache,
                   cbk.id,
                   cbk.plaintext_apikey,
                   cbk.plaintext_signingkey,
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
                       WHERE psk.id = cbk.signingkey
                   ) as signingkey,
                   json_build_object(
                           'id', ak.id,
                           'user', row_to_json(u.*),
                           'name', ak.name,
                           'hash', ak.hash,
                           'description', ak.description,
                           'created_at', ak.created_at,
                           'last_used', ak.last_used
                   ) as api_key
            FROM cache.cache_builder_key cbk
                     INNER JOIN cache.cache c ON cbk.cache = c.id
                     INNER JOIN cache.api_key ak ON ak.id = cbk.apikey
                     INNER JOIN cache.user u ON u.id = ak."user"
        `).then((res)=>{
            return res.rows as cache_builder_key_type[]
        })
    }
}
