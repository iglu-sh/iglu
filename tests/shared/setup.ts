/**
 * This file sets up the test environment and is run before every test
 * */
import Logger from "@/logger";
import { setupDatabase } from "./daos/utils";

Logger.setJsonLogging(false)
Logger.setPrefix("Test")
Logger.setLogLevel("WARN")

await setupDatabase("SQLite");
