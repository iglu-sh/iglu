import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
    out: "./cache/drizzle/sqlite_drizzle",
    schema: "./shared/db/schema_sqlite.ts",
    dialect: "sqlite",
    dbCredentials: {
        url: "./cache/out.sqlite" 
    },
});
