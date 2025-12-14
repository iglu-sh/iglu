import {Table} from "./Table.ts";
import type {user as table_type} from "@iglu-sh/types/core/db";
import type {QueryResult} from "pg";
import bcrypt from "bcryptjs"
export class User extends Table {
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
            SELECT * FROM cache.user
        `).then((res)=>{
            return res.rows as table_type[]
        })
    }

    public async getByUsername(username:string):Promise<table_type>{
        const entry = this.data.find((bl) => bl.username === username)
        if(!entry){
            throw new Error(`Entry with username ${username} not found`)
        }
        return entry
    }

    private hashPW(password:string):Promise<string>{
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
                    return false
                } else {
                    return true
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
    public override modifyEntry(updatedEntry: unknown): Promise<unknown> {
        return Promise.resolve(undefined);
    }
}
