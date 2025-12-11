import {Table} from "./Table.ts";
import type {public_signing_key as table_type} from "@iglu-sh/types/core/db";
export class Public_signing_key extends Table {
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
    }
    public async getByApiKeyId(apiKeyId:string):Promise<table_type[]> {
        return this.data.filter((key)=>key.api_key.id === apiKeyId)
    }
    public async getByCacheId(cacheId:string):Promise<table_type[]> {
        const ids = await this.query(`
            SELECT DISTINCT cskl.public_signing_key FROM cache.cache_signing_key_link cskl WHERE cskl.cache = $1
        `, [cacheId]).then((res)=>res.rows as string[])
        return this.data.filter((key)=>ids.includes(key.api_key.id))
    }
    public override async createNewEntry(newEntry: table_type): Promise<void> {
        throw new Error("Method not implemented.")
    }
    public override async modifyEntry(updatedEntry:table_type): Promise<void> {
        throw new Error("Method not implemented.")
    }
}
