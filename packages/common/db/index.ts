import {Client, type QueryResult} from 'pg';
import Logger from "@iglu-sh/logger";
import {Setup as libSetup} from "./setup.ts";
import * as process from "node:process";
export namespace db {
    export abstract class Database {
        protected constructor(method: 'static' | 'dynamic') {
            Logger.debug("Constructing Database instance with method: " + method);
        }
        public getType():'static' | 'dynamic'{
            return (this instanceof StaticDatabase) ? 'static' : 'dynamic'
        }
        /*
        * @description Connect to the Database
        * @param autoDisconnect - Whether to automatically disconnect after a period of inactivity (default: false for static use true for dynamic use, 2000ms to timeout)
        * @return Promise<void>
        * */
        public abstract connect(autoDisconnect?:boolean):Promise<void>
        public abstract getIsConnected():boolean
        /*
        * @description Disconnect from the Database
        * @return Promise<void>
        * */
        public abstract disconnect():Promise<void>


        /*
        * @description Query the Database
        * @param query - The SQL query string
        * @param params - The parameters for the SQL query
        * @param user - The user that is executing the query (optional)
        * @return Promise<QueryResult<any>>
        * */
        public abstract query(query:string, params?:Array<unknown>, user?:string):Promise<QueryResult<any>>
    }
    export class StaticDatabase extends Database{
        private static client: Client;
        private static isConnected: boolean = false;
        constructor(){
            super("static")
            StaticDatabase.client = new Client({
                user: process.env.POSTGRES_USER,
                host: process.env.POSTGRES_HOST,
                database: process.env.POSTGRES_DB,
                password: process.env.POSTGRES_PASSWORD,
                port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
            })
        }
        public static getType(): "static" | "dynamic" {
            return "static"
        }

        public static async connect(autoDisconnect:boolean = true):Promise<void>{
            Logger.info("Connecting to database...");
            await StaticDatabase.client.connect();
            StaticDatabase.isConnected = true;
        }
        public static getIsConnected():boolean{
            return StaticDatabase.isConnected;
        }

        public static async disconnect():Promise<void>{
            Logger.info("Disconnecting from database...");
            await StaticDatabase.client.end();
            StaticDatabase.isConnected = false;
        }
        public static async query(query:string, params:Array<unknown> = [], user?:string){
            // limit the logging of params to the first 40 characters to prevent logging very long params

            Logger.debug(`Executing query: ${query} with params: ${JSON.stringify(params).substring(0, 40)}`);
            if(!StaticDatabase.isConnected){
                throw new Error("StaticDatabase is not connected. Please call connect() before querying.")
            }
            if(user){
                await StaticDatabase.client.query(
                    `SELECT set_config('cache.current_user', $1, false);`
                    , [user])
            }

            return await StaticDatabase.client.query(query, params)
        }
        public override connect(autoDisconnect?: boolean): Promise<void> {
            throw new Error('Method not implemented.');
        }
        public override getIsConnected(): boolean {
            throw new Error('Method not implemented.');
        }
        public override disconnect(): Promise<void> {
            throw new Error('Method not implemented.');
        }
        public override query(query: string, params?: Array<unknown>, user?: string): Promise<QueryResult<any>> {
            throw new Error('Method not implemented.');
        }
    }
    export class DynamicDatabase extends Database{
        private client: Client;
        private timeout: NodeJS.Timeout | undefined;
        private is_connected: boolean = false;
        constructor(){
            super("static")
            this.client = new Client({
                user: process.env.POSTGRES_USER,
                host: process.env.POSTGRES_HOST,
                database: "cache",
                password: process.env.POSTGRES_PASSWORD,
                port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
            })
        }
        public async connect(autoDisconnect:boolean = true):Promise<void>{
            Logger.info("Connecting to database...");
            await this.client.connect();
            if(autoDisconnect){
                this.timeout = setTimeout(async () => {
                    Logger.info("Auto-disconnecting from database due to inactivity...");
                    await this.disconnect();
                }, 2000)
            }
            this.is_connected = true;
        }
        public async disconnect():Promise<void>{
            Logger.info("Disconnecting from database...");
            await this.client.end();
            this.is_connected = false;
        }
        public async query(query:string, params:Array<unknown> = [], user?:string){
            if(!this.is_connected){
                await this.connect().then(()=>{
                    Logger.debug("Connected to database for query.");
                })
            }
            Logger.debug(`Executing query: ${query} with params: ${params}`);
            if(user){
                await this.client.query(
                    `SELECT set_config('cache.current_user', $1, false);`
                    , [user])
            }
            return await this.client.query(query, params)
        }

        getIsConnected(): boolean {
            return this.is_connected;
        }
    }
}
export * from "./tables/index.ts"
export const Setup = libSetup;
