import "dotenv/config";
import { defineConfig } from "drizzle-kit";
export default defineConfig({
    out: "./cache-drizzle-conf",
    schema: "../shared/db/schema_sqlite.ts",
    dialect: "sqlite",
    dbCredentials: {
        url: process.env.DB_FILE_NAME!,
    },
});
