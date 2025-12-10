import { Client } from 'pg';
import Logger from "@iglu-sh/logger";
import {Setup as libSetup} from "./setup.ts";
export namespace db {
    export class Database{
        private static client: Client;
        private static timeout: NodeJS.Timeout | undefined;

        constructor(){
            Database.client = new Client({
                user: process.env.POSTGRES_USER,
                host: process.env.POSTGRES_HOST,
                database: process.env.POSTGRES_DB,
                password: process.env.POSTGRES_PASSWORD,
                port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
            })
        }

        /*
        * @description Connect to the Database
        * @param autoDisconnect - Whether to automatically disconnect after a period of inactivity (default: true, 2000ms to timeout)
        * @return Promise<void>
        * */
        public async connect(autoDisconnect:boolean = true):Promise<void>{
            Logger.info("Connecting to database...");
            await Database.client.connect();

            // Used to automatically disconnect after a period of inactivity
            if(autoDisconnect){
                Database.timeout = setTimeout(()=>{void this.disconnectWrap(this)}, 2000)
            }
        }

        /*
        * @description Disconnect from the Database, however this should not be used directly and only used in the autoDisconnect feature
        * @param cl - The Database client instance
        * @return Promise<void>
        * */
        private async disconnectWrap(cl: Database){
            await cl.disconnect()
        }

        /*
        * @description Disconnect from the Database
        * @return Promise<void>
        * */
        public async disconnect():Promise<void>{
            Logger.info("Disconnecting from database...");
            await Database.client.end();
        }

        /*
        * @description Query the Database
        * @param query - The SQL query string
        * @param params - The parameters for the SQL query
        * @param user - The user that is executing the query (optional)
        * @return Promise<QueryResult<any>>
        * */
        public async query(query:string, params:Array<unknown> = [], user?:string){
            Logger.debug(`Executing query: ${query} with params: ${params}`);
            if(user){
                await Database.client.query(
                    `SELECT set_config('cache.current_user', $1, false);`
                    , [user])
            }

            return await Database.client.query(query, params)
        }
    }
}