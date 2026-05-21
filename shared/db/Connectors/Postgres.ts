import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { Configuration } from "../../utils/cache/Configuration";

export default class PostgresConnector {
    private static db: NodePgDatabase<Record<string, never>> & { $client: Pool };

    public getDB() {
        if (!Configuration.getConfig()) {
            throw new Error("Could not get DB: No Config in RAM");
        }
        if (!PostgresConnector.db) {
            PostgresConnector.db = drizzle({
                connection: {
                    host: Configuration.getConfig().database.host,
                    user: Configuration.getConfig().database.user,
                    database: Configuration.getConfig().database.name,
                    port: Configuration.getConfig().database.port,
                    password: Configuration.getConfig().database.password,
                },
            });
        }
        return PostgresConnector.db;
    }
}
