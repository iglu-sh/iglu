import { Database } from "bun:sqlite";
import { drizzle as drizzle_sqlite } from "drizzle-orm/bun-sqlite";
import { migrate as sqlite_migrator } from "drizzle-orm/bun-sqlite/migrator";
import { load_config } from "../../cache/lib/load_config";
import { Logger } from "../logger";

const config = await load_config("./cache/config.toml");
Logger.setJsonLogging(false);
Logger.setPrefix("Migrator", "CYAN");

if (config.database.database_type === "sqlite") {
    Logger.info("Running migrations for sqlite!");
    process.env.DB_TYPE = "sqlite";
    process.env.DB_FILE_NAME = config.database.database_file_location;

    const sqlite = new Database(config.database.database_file_location);

    sqlite.run("PRAGMA foreign_keys = ON;");

    const db = drizzle_sqlite(sqlite);

    sqlite_migrator(db, {
        migrationsFolder: "./cache/cache-drizzle-conf",
    });

    sqlite.close();
    Logger.info("Done with sqlite migrations!");
}
