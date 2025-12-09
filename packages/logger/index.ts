import chalk from "chalk";
import {Chalk} from 'chalk';
import * as fs from "node:fs";
import {WriteStream} from "node:fs";
type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";
type JSONLog = {
    prefix: string;
    level: LogLevel;
    message: string;
    timestamp: string;
}
type AvailablePrefixColors = "GRAY" | "GREEN" | "YELLOW" | "RED" | "BLUE" | "MAGENTA" | "CYAN" | "WHITE";

export default class Logger{
    private static customChalk: typeof chalk = new Chalk({level: 3});
    private static logLevelMap: any = {
        "DEBUG": 1,
        "INFO": 2,
        "WARN": 3,
        "ERROR": 4
    };
    private static prefixColors: any = {
        "GRAY": Logger.customChalk.bgGray,
        "GREEN": Logger.customChalk.bgGreen,
        "YELLOW": Logger.customChalk.bgYellow,
        "RED": Logger.customChalk.bgRed,
        "BLUE": Logger.customChalk.bgBlue,
        "MAGENTA": Logger.customChalk.bgMagenta,
        "CYAN": Logger.customChalk.bgCyan,
        "WHITE": Logger.customChalk.bgWhite
    }

    // If this is set to true, the logger will use environment variables to determine everything
    public static useEnvVars: boolean = !!(process.env.LOGGER_USE_ENV && process.env.LOGGER_USE_ENV === "true");
    private static prefixText: string = Logger.useEnvVars && process.env.LOGGER_PREFIX ? process.env.LOGGER_PREFIX : "";
    private static prefix = Logger.useEnvVars ? Logger.prefixColors[process.env.LOGGER_USE_ENV && process.env.LOGGER_PREFIX_COLOR ? process.env.LOGGER_PREFIX_COLOR : "BLUE"](Logger.prefixText) : "" ;
    private static logLevel: number = Logger.useEnvVars && process.env.LOG_LEVEL ? Logger.logLevelMap[process.env.LOG_LEVEL] : 1;
    private static jsonLogging: boolean = Logger.useEnvVars && process.env.LOGGER_JSON ? process.env.LOGGER_JSON === "true" : true;
    private static logLevelColorMap: any = {
        "DEBUG": Logger.customChalk.bgGray,
        "INFO": Logger.customChalk.bgGreen,
        "WARN": Logger.customChalk.bgYellow,
        "ERROR": Logger.customChalk.bgRed
    };
    private static verbColorMap: any = {
        "GET": Logger.customChalk.bgGreenBright,
        "POST": Logger.customChalk.bgYellowBright,
        "PUT": Logger.customChalk.bgCyanBright,
        "PATCH": Logger.customChalk.bgMagentaBright,
        "DELETE": Logger.customChalk.bgRedBright,
        "HEAD": Logger.customChalk.bgBlackBright,
        "OPTIONS": Logger.customChalk.bgCyanBright,
        "WS": Logger.customChalk.bgCyan
    }
    private static statusCodeColorMap: any = {
        "1xx": Logger.customChalk.gray,
        "2xx": Logger.customChalk.green,
        "3xx": Logger.customChalk.blue,
        "4xx": Logger.customChalk.yellow,
        "5xx": Logger.customChalk.red,
        "default": Logger.customChalk.white
    }
    public static logStream: ((data: string) => void) | undefined = process.env.LOGGER_LOG_FILE ? (data:string) => {fs.appendFileSync(`./${Logger.prefixText}.log`, data, undefined)} : undefined;
    public static setLogLevel(level: LogLevel){
        if(!Logger.logLevelMap[level]){
            throw new Error(`${chalk.bgRed("ERROR:")} Invalid log level: ${level}`);
        }
        Logger.logLevel = Logger.logLevelMap[level];
    }
    public static setJsonLogging(jsonLogging: boolean){
        Logger.jsonLogging = jsonLogging;
    }
    public static setPrefix(prefix: string, color: AvailablePrefixColors = "BLUE"){
        if(!Logger.prefixColors[color]){
            throw new Error(`${chalk.bgRed("ERROR:")} Invalid prefix color: ${color}`);
        }
        Logger.prefix = Logger.prefixColors[color](prefix);
        Logger.prefixText = prefix;
    }
    public static setLogFile(){
        Logger.logStream = (data:string) => {fs.appendFileSync(`./${Logger.prefixText}.log`, data, undefined)};
    }
    static log(level:LogLevel, message: string){
        if(Logger.logLevelMap[level] < Logger.logLevel){
            return;
        }
        if(Logger.jsonLogging){
            console.log(JSON.stringify({
                prefix: Logger.prefixText,
                level,
                message,
                timestamp: new Date().toISOString()
            } as JSONLog));
            if(Logger.logStream){
                Logger.logStream(JSON.stringify({
                    prefix: Logger.prefixText,
                    level,
                    message,
                    timestamp: new Date().toISOString()
                } as JSONLog) + '\n');
            }
        }else{
            console.log(this.prefix, Logger.customChalk.grey(`${new Date().toISOString()}`), Logger.logLevelColorMap[level](`${level}`), message);
            if(Logger.logStream){
                Logger.logStream(`${Logger.prefixText} ${new Date().toISOString()} [${level}] ${message}\n`);
            }
        }
    }

    public static debug(message: string){
        this.log('DEBUG', message);
    }
    public static info(message: string){
        this.log('INFO', message);
    }
    public static warn(message: string){
        this.log('WARN', message);
    }
    public static error(message: string){
        this.log('ERROR', message);
    }
    static logRequest(endpoint:string, method:string){
        if(Logger.jsonLogging){
            this.log('DEBUG', `${method} ${endpoint}`);
        }
        else{
            console.log(Logger.customChalk.grey(`${new Date().toISOString()}`), `${Logger.verbColorMap[method](method)} `, endpoint);
        }
    }
    static logResponse(endpoint:string, method:string, statusCode:number){
        if(Logger.jsonLogging){
            this.log('DEBUG', `${this.prefixText} ${method} ${endpoint} - ${statusCode}`);
        }
        else{
            let statusCodeGroup = Math.floor(statusCode / 100);
            let statusCodeColor = Logger.statusCodeColorMap[`${statusCodeGroup}xx`] ? Logger.statusCodeColorMap[`${statusCodeGroup}xx`] : Logger.statusCodeColorMap['default'];
            console.log(Logger.customChalk.grey(`${this.prefix} ${new Date().toISOString()}`), statusCodeColor(statusCode), `${Logger.verbColorMap[method](method)} `, endpoint);
        }
    }
}
