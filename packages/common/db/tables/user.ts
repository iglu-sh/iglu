import {Table} from "./Table.ts";
import type {user as table_type} from "@iglu-sh/types/core/db";
import type {QueryResult} from "pg";
import bcrypt from "bcryptjs"
export class User extends Table {
    private data: table_type[] = [];
    private queryString:string = `
        SELECT id, username, email, password, createdat, updatedat, last_login, is_admin, is_verified, must_change_password, show_oob, concat('/api/v1/user/',id,'/avatar') as avatar, avatar_color FROM cache.user
    `;
    public async getData():Promise<table_type[]> {
        return this.data
    }
    public async getById(id:string):Promise<table_type> {
        const entry = await this.query(this.queryString + `WHERE id = $1`, [id]).then((res)=>{
            return res.rows[0] as table_type | undefined
        })
        if(!entry){
            throw new Error(`Entry with id ${id} not found`)
        }
        return entry
    }
    public async getAvatarById(id:string):Promise<Buffer>{
        const entry = await this.query(`SELECT avatar FROM cache.user WHERE id = $1`, [id]).then((res)=>{
            return res.rows[0]?.avatar as Buffer | undefined
        })
        if(!entry){
            throw new Error(`Avatar for user with id ${id} not found`)
        }
        return entry
    }
    public async init(): Promise<void> {
        this.data = await this.query(this.queryString).then((res)=>{
            return res.rows as table_type[]
        })
    }

    public async getByUsername(username:string):Promise<table_type>{
        const entry = await this.query(this.queryString + `WHERE username = $1`, [username]).then((res)=>{
            return res.rows[0] as table_type | undefined
        })
        if(!entry){
            throw new Error(`Entry with username ${username} not found`)
        }
        return entry
    }

    public hashPW(password:string):Promise<string>{
        return new Promise((resolve, reject) => {
            bcrypt.hash(password, 10, (err, hash) => {
                if (err || !hash) {
                    reject(err ?? new Error("Hashing failed"));
                } else {
                    resolve(hash);
                }
            });
        });
    }

    public async verifyPW(password:string, hash:string):Promise<boolean>{
        return new Promise((resolve, reject) => {
            bcrypt.compare(password, hash, (err, res) => {
                if (err) {
                    resolve(false)
                } else {
                    resolve(true);
                }
            });
        });
    }
    /*
    * Creates a new user. **Important** Provide the password in plaintext, it will be bcrypted here.
    * @param newEntry The new user to create
    * */
    public override async createNewEntry(newEntry: table_type): Promise<QueryResult<table_type>> {
        // Hash the password with bcrypt first
        newEntry = {
            ...newEntry,
            password: await this.hashPW(newEntry.password)
        }
        return this.query(`
            INSERT INTO cache.user(username, email, password, is_admin, last_login, is_verified, must_change_password, show_oob)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *;
        `, [
            newEntry.username,
            newEntry.email,
            newEntry.password,
            newEntry.is_admin,
            newEntry.last_login,
            newEntry.is_verified,
            newEntry.must_change_password,
            newEntry.show_oob
        ])
    }
    public override async modifyEntry(updatedEntry: table_type): Promise<QueryResult<table_type>> {
        return await this.query(`
            UPDATE cache.user SET (username, email, password, is_admin, last_login, is_verified, must_change_password, show_oob, avatar, avatar_color) = ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            WHERE id = $11
        `, [
            updatedEntry.username,
            updatedEntry.email,
            updatedEntry.password,
            updatedEntry.is_admin,
            updatedEntry.last_login,
            updatedEntry.is_verified,
            updatedEntry.must_change_password,
            updatedEntry.show_oob,
            updatedEntry.avatar,
            updatedEntry.avatar_color,
            updatedEntry.id
        ])
    }
}
