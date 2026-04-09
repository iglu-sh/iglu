import Logger from "@/logger";
import raw from "express";
import path from "node:path";
import type { NextFunction, Request, Response } from "express";
import express from 'express';
import createRouter from "express-file-routing";

const app = express();

Logger.setJsonLogging(false);
Logger.setPrefix("Controller");
Logger.info("Logger initialized!");


// Raw body parser
app.use(raw)

//Log response
app.use((req:Request, res:Response, next:NextFunction)=>{
    res.on('finish', ()=>{
        Logger.logResponse(req.url, req.method, res.statusCode)
    })
    next()
})

await createRouter(app, {
    directory: "./cache/routes",
    additionalMethods: [ "ws" ]
})

/*
app.use((req:Request, res:Response)=>{
    Logger.logRequest(`[CATCHALL] ${req.url}`, req.method)
    res.status(200).send('OK')
})
*/


Logger.debug("Startup Complete")
app.listen(3000, ()=>{
    Logger.debug("Running on 3000")
})
