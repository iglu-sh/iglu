import {Table} from "./Table.ts";
import type {
    hash_cache_link,
    hash_cache_link as cache_signing_key_link_type,
    hash_cache_link_raw
} from "@iglu-sh/types/core/db";
import type {QueryResult} from "pg";

export class Hash_cache_link extends Table {
    private data: cache_signing_key_link_type[] = [];
    private queryString:string = `
        SELECT hcl.id, row_to_json(hcl_c.*) as cache,
               (
                   SELECT
                       json_build_object(
                               'id', h.id,
                               'path', h.path,
                               'updated_at', h.updated_at,
                               'cderiver', h.cderiver,
                               'cfilehash', h.cfilehash,
                               'cfilesize', h.cfilesize,
                               'cnarhash', h.cnarhash,
                               'cnarsize', h.cnarsize,
                               'creferences', h.creferences,
                               'csig', h.csig,
                               'cstorehash', h.cstorehash,
                               'cstoresuffix', h.cstoresuffix,
                               'parts', h.parts,
                               'compression', h.compression,
                               'creator_api_key', (
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
                               ),
                               'signed_by', (
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
                               )
                       )
                   FROM cache.hash h
                   WHERE h.id = hcl.hash
               ) as hash
        FROM cache.hash_cache_link hcl
                 INNER JOIN cache.cache hcl_c ON hcl.cache = hcl_c.id
    `
    public async getData():Promise<cache_signing_key_link_type[]> {
        return this.data
    }
    public async getById(id:string):Promise<cache_signing_key_link_type> {
        const entry = await this.query(this.queryString + "WHERE hcl.id = $1", [id]).then((res)=>{
            return res.rows[0] as cache_signing_key_link_type | undefined
        })
        if(!entry){
            throw new Error(`Build Log with id ${id} not found`)
        }
        return entry
    }
    public async getByHashId(hashId:string):Promise<cache_signing_key_link_type[]> {
        return await this.query(this.queryString + "WHERE hcl.hash = $1", [hashId]).then((res) => {
            return res.rows as cache_signing_key_link_type[]
        })
    }
    public async getByCacheId(cacheId:string):Promise<cache_signing_key_link_type[]> {
        return await this.query(this.queryString + "WHERE hcl.cache = $1", [cacheId]).then((res) => {
            return res.rows as cache_signing_key_link_type[]
        })
    }
    public async getByCacheAndHash(cacheId:string, hashId:string):Promise<cache_signing_key_link_type[]> {
        return await this.query(this.queryString + "WHERE hcl.cache = $1 AND hcl.hash = $2", [cacheId, hashId]).then((res) => {
            return res.rows as cache_signing_key_link_type[]
        })
    }
    public async init(): Promise<void> {
        this.data = await this.query(`
        `).then((res)=>{
            return res.rows as cache_signing_key_link_type[]
        })
    }
    public async createNewEntry(newEntry: {cache:{id:string}, hash:{id:string}}):Promise<QueryResult<hash_cache_link_raw>>{
        return await this.query(`
            INSERT INTO cache.hash_cache_link (cache, hash)
            VALUES ($1, $2)
        `, [newEntry.cache.id, newEntry.hash.id])
    }
    public async getByCacheAndCStoreHash(cacheId:string, hash:string):Promise<hash_cache_link>{
        return await this.query(this.queryString+`WHERE hcl.cache = $1 AND hcl.hash IN (
            SELECT h.id FROM cache.hash h WHERE h.cstorehash = $2
        )`, [cacheId, hash]).then((res)=>{
            if(res.rows.length === 0){
                throw new Error(`No hash_cache_link found for cache ${cacheId} and store hash ${hash}`)
            }
            return res.rows[0] as hash_cache_link
        })
    }
}
