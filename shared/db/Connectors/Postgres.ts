import Configuration from "@/cache/lib/Configuration"
import type { config } from "@/cache/lib/load_config";
import {drizzle} from 'drizzle-orm/node-postgres'

export default class PostgresConnector {
    private static config: config = Configuration.getConfig();
    private static db = drizzle({
        connection: {
            host: PostgresConnector.config.database.host,
            user: PostgresConnector.config.database.user,
            database: PostgresConnector.config.database.name,
            port: PostgresConnector.config.database.port,
            password: PostgresConnector.config.database.password
        }
    })

    public getDB(){
        return PostgresConnector.db
    }
}
