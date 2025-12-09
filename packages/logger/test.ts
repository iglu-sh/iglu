import Logger from "./index";
Logger.setLogLevel("DEBUG")
Logger.setJsonLogging(true)
Logger.setPrefix("TestApp", "BLUE");

Logger.debug("This is a debug message");
Logger.info("This is an info message");
Logger.warn("This is a warning message");
Logger.error("This is an error message");

process.exit(1)