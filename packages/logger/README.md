# iglu-logger
## Description
This is the logger library for all parts of the [Iglu Project](https://github.com/iglu-sh).

It does **NOT** create log files, it only prints beautiful messages on the CLI.

You can find this lib on [npmjs.com](https://www.npmjs.com/package/@iglu-sh/logger).

## How to use?
### Installation
```bash
# bun
bun add @iglu-sh/logger

# npm
npm install @iglu-sh/logger
```
### Settings

```javascript
import Logger from "@iglu-sh/logger";

// Default value
Logger.useEnvVars = true; // Enable configuration via env variables
Logger.logLevel = 1; // Could be set via LOG_LEVEL env (only if Logger.useEnvVars is set to true, must be one of: INFO, DEBUG, ERROR or WARN)
Logger.jsonLogging = true; // Could be set via the LOGGER_JSON env (only if Logger.useEnvVars is set to true, must be one of: true or false)
```
### Functions
```javascript
import Logger from "@iglu-sh/logger";

// Generic logging
Logger.error("This is a error message!");
Logger.debug("This is a debug message!");
Logger.info("This is a info message!");
Logger.warn("This is a warn message!");

// REST-API logging
Logger.logRequest("/api/v1/example", "GET");
Logger.logResponse("/api/v1/example", "GET", 200);
```

## Development
To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

## Environment variables
The Following environment variables can be used to configure the logger:  
One Important note: If you set `LOGGER_USE_ENV` to `false`, the logger will not use any environment variables, and you must set the values in code.

| Variable              | Description                                                          |
|-----------------------|----------------------------------------------------------------------|
| `LOG_LEVEL`           | The Level to Log variables for, may be DEBUG INFO WARN or ERROR      |
| `LOGGER_USE_ENV`      | Specifies if the Logger should use env vars                          |
| `LOGGGER_JSON`        | Specifies if the Logger should log in JSON format                    |
| `LOGGER_PREFIX`       | The prefix to use for the logger, defaults to an empty string        |
| `LOGGER_PREFIX_COLOR` | The color to use for the prefix, defaults to `BLUE`                  |
| `LOGGER_LOG_FILE`     | Specify weather the logger should log to a file, defaults to `false` |

## License
This project is licensed under the GLWTS(Good Luck With That Shit, No LLMs) Public License. For more information see the LICENSE file in this repo