/**
 * This file sets up the test environment and is run before every test
 * */
import Logger from "@/logger";
import { setupDatabase } from "../shared/daos/utils";

Logger.setJsonLogging(false)
Logger.setPrefix("Test")
Logger.setLogLevel("WARN")

process.env.HOSTNAME = "https://iglu.example.com"
process.env.STORAGE_TYPE = 'fs'
process.env.FILESYSTEM_DIRECTORY = '/tmp/iglu'
await setupDatabase('SQLite')

