import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
    out: "./drizzle/sqlite_drizzle",
    schema: "./node_modules/@iglu-sh/shared/db/schema_sqlite.ts",
    dialect: "sqlite",
    dbCredentials: {
        url: process.env.DB_FILE_LOCATION ?? "./out.sqlite",
    },
});
