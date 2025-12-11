import {Table} from "./Table.ts";
import type {
    hash as table_type
} from "@iglu-sh/types/core/db";
export class Hash extends Table {
    private data: table_type[] = [];
    public async getData():Promise<table_type[]> {
        return this.data
    }
    public async getById(id:string):Promise<table_type> {
        const entry = this.data.find((bl) => bl.id === id)
        if(!entry){
            throw new Error(`Build Log with id ${id} not found`)
        }
        return entry
    }
    public async init(): Promise<void> {
        this.data = await this.query(`
            SELECT
                id, path, updated_at, cderiver, cfilehash, cfilesize, cnarhash, cnarsize, creferences, csig, cstorehash, cstoresuffix, parts, compression,
                (
                    SELECT json_build_object(
                                   'id', ak.id,
                                   'user', row_to_json(u.*),
                                   'name', ak.name,
                                   'hash', ak.hash,
                                   'description', ak.description,
                                   'created_at', ak.created_at,
                                   'last_used', ak.last_used
                           )
                    FROM cache.api_key ak
                             INNER JOIN cache."user" u ON u.id = ak."user"
                    WHERE ak.id = h.creator_api_key
                ) as creator_api_key,
                (
                    SELECT json_build_object('id', cskl.id, 'cache', row_to_json(c.*),
                         'signingkey', (
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
                                                 'last_used', ak_psk.last_used),
                                         'name', psk.name,
                                         'public_key', psk.public_signing_key,
                                         'description', psk.description,
                                         'created_at', psk.created_at
                                 )
                             FROM cache.public_signing_key psk
                                      INNER JOIN cache.api_key ak_psk ON psk.api_key = ak_psk.id
                                      INNER JOIN cache.user u_psk ON ak_psk."user" = u_psk.id
                             WHERE psk.id = cskl.public_signing_key
                         ))
                    FROM cache.cache_signing_key_link cskl
                             INNER JOIN cache.cache c ON c.id = cskl.cache
                    WHERE cskl.id = h.signed_by
                ) as signed_by
            FROM cache.hash h 
        `).then((res)=>{
            return res.rows as table_type[]
        })
    }

    public override async createNewEntry(newEntry: table_type):Promise<void>{
        throw new Error("Not implemented")
    }

    public override async modifyEntry(newEntry: table_type):Promise<void>{
        throw new Error("Not implemented")
    }

    public override async deleteById(id:string):Promise<void>{
        await this.query(`
            DELETE FROM cache.hash WHERE id = $1
        `, [id])
    }
}