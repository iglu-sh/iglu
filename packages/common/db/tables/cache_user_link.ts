import {Table} from "./Table.ts";
import type {cache_user_link as cache_user_link_type, cache_user_link_raw} from "@iglu-sh/types/core/db";

export class Cache_user_link extends Table {
    private data: cache_user_link_type[] = [];
    private queryString:string = `
        SELECT cul.id, row_to_json(c.*) as cache,
                json_build_object(
                    'id', u.id,
                    'username', u.username,
                    'email', u.email,
                    'createdat', u.createdat,
                    'updatedat', u.updatedat,
                    'last_login', u.last_login,
                    'is_admin', u.is_admin,
                    'is_verified', u.is_verified,
                    'must_change_password', u.must_change_password,
                    'show_oob', u.show_oob,
                    'avatar_color', u.avatar_color,
                    'avatar', concat('/api/v1/user/', u.id, '/avatar')
                )
                as "user" FROM cache.cache_user_link cul
            INNER JOIN cache.cache c ON  cul.cache = c.id
            INNER JOIN cache."user" u ON cul."user" = u.id
    `
    public async getData():Promise<cache_user_link_type[]> {
        return this.data
    }
    public async getById(id:string):Promise<cache_user_link_type> {
        const entry = await this.query(this.queryString + `WHERE cul.id = $1`, [id]).then((res)=>{
            return res.rows[0] as cache_user_link_type | undefined
        })
        if(!entry){
            throw new Error(`Build Log with id ${id} not found`)
        }
        return entry
    }
    public async getByUser(userId:string){
        return await this.query(this.queryString + `WHERE cul."user" = $1`, [userId]).then((res)=>{
            return res.rows as cache_user_link_type[]
        })
    }
    public async init(): Promise<void> {
        this.data = await this.query(this.queryString).then((res)=>{
            return res.rows as cache_user_link_type[]
        })
    }
    public async createNewEntry(newEntry:cache_user_link_type):Promise<cache_user_link_raw>{
        return await this.query(
            `INSERT INTO cache.cache_user_link (cache, "user") VALUES ($1, $2) RETURNING *`,
            [newEntry.cache.id, newEntry.user.id],
        ).then((res) => {
            return res.rows[0] as cache_user_link_raw
        })
    }
}
