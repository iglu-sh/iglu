/**
 * This file sets up the test environment and is run before every test
 * */
import Logger from "@/logger";
import { setupDatabase } from "../shared/daos/utils";

Logger.setJsonLogging(false)
Logger.setPrefix("Test")
Logger.setLogLevel("WARN")

process.env.HOSTNAME = "https://iglu.example.com"
await setupDatabase('SQLite')

