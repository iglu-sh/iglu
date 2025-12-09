import chalk, {Chalk} from "chalk";
const dotenv = require("dotenv");
type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";
type JSONLog = {
    level: LogLevel;
    message: string;
    timestamp: string;
}
export class Logger{
    private static logLevel: number = 1;
    private static jsonLogging: boolean = true;
    private static customChalk: typeof chalk = new Chalk({level: 3});
    private static logLevelMap: any = {
        "DEBUG": 1,
        "INFO": 2,
        "WARN": 3,
        "ERROR": 4
    };

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
    public setLogLevel(level: LogLevel){
        if(!Logger.logLevelMap[level]){
            throw new Error(`${chalk.bgRed("ERROR:")} Invalid log level: ${level}`);
        }
        Logger.logLevel = Logger.logLevelMap[level];
    }
    public setJsonLogging(jsonLogging: boolean){
        Logger.jsonLogging = jsonLogging;
    }
    static log(level:LogLevel, message: string){
        if(Logger.logLevelMap[level] < Logger.logLevel){
            return;
        }
        if(Logger.jsonLogging){
            console.log(JSON.stringify({
                level,
                message,
                timestamp: new Date().toISOString()
            } as JSONLog));
        }else{
            console.log(Logger.customChalk.grey(`${new Date().toISOString()}`), Logger.logLevelColorMap[level](`${level}`), message);
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
            this.log('DEBUG', `${method} ${endpoint} - ${statusCode}`);
        }
        else{
            let statusCodeGroup = Math.floor(statusCode / 100);
            let statusCodeColor = Logger.statusCodeColorMap[`${statusCodeGroup}xx`] ? Logger.statusCodeColorMap[`${statusCodeGroup}xx`] : Logger.statusCodeColorMap['default'];
            console.log(Logger.customChalk.grey(`${new Date().toISOString()}`), statusCodeColor(statusCode), `${Logger.verbColorMap[method](method)} `, endpoint);
        }
    }
    constructor() {
        dotenv.config()
    }
}