import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
    out: "./drizzle/postgres_drizzle",
    schema: "./node_modules/@iglu-sh/shared/db/schema_pg.ts",
    dialect: "postgresql",
    dbCredentials: {
        user: process.env.DB_USER ?? "postgres",
        password: process.env.DB_PASSWORD ?? "postgres",
        host: process.env.DB_HOST ?? "localhost",
        port: parseInt(process.env.DB_PORT ?? "5432", 10),
        database: process.env.DB_NAME ?? "iglu",
        ssl: false,
    },
});
