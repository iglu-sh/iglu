import {Client, type QueryResult} from 'pg';
import Logger from "@iglu-sh/logger";
import {Setup as libSetup} from "./setup.ts";
export namespace db {
    export abstract class Database {
        constructor(method: 'static' | 'dynamic') {
            Logger.debug("Constructing Database instance with method: " + method);
        }
        /*
        * @description Connect to the Database
        * @param autoDisconnect - Whether to automatically disconnect after a period of inactivity (default: false for static use true for dynamic use, 2000ms to timeout)
        * @return Promise<void>
        * */
        public abstract connect(autoDisconnect?:boolean):Promise<void>

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
        private static timeout: NodeJS.Timeout | undefined;

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

        public async connect(autoDisconnect:boolean = true):Promise<void>{
            Logger.info("Connecting to database...");
            await StaticDatabase.client.connect();
        }



        public async disconnect():Promise<void>{
            Logger.info("Disconnecting from database...");
            await StaticDatabase.client.end();
        }
        public async query(query:string, params:Array<unknown> = [], user?:string){
            Logger.debug(`Executing query: ${query} with params: ${params}`);
            if(user){
                await StaticDatabase.client.query(
                    `SELECT set_config('cache.current_user', $1, false);`
                    , [user])
            }

            return await StaticDatabase.client.query(query, params)
        }
    }
    export class DynamicDatabase extends Database{
        private client: Client;
        private timeout: NodeJS.Timeout | undefined;

        constructor(){
            super("static")
            this.client = new Client({
                user: process.env.POSTGRES_USER,
                host: process.env.POSTGRES_HOST,
                database: process.env.POSTGRES_DB,
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
        }
        public async disconnect():Promise<void>{
            Logger.info("Disconnecting from database...");
            await this.client.end();
        }
        public async query(query:string, params:Array<unknown> = [], user?:string){
            Logger.debug(`Executing query: ${query} with params: ${params}`);
            if(user){
                await this.client.query(
                    `SELECT set_config('cache.current_user', $1, false);`
                    , [user])
            }

            return await this.client.query(query, params)
        }

    }
}