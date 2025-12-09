import type {NextFunction, Request, Response} from 'express'
import raw from 'express'
import createRouter from "express-file-routing"
import Logger from "@iglu-sh/logger";

// Configure Logger
Logger.setPrefix("builder")
Logger.setJsonLogging(process.env.JSON_LOGGING && process.env.JSON_LOGGING == 'true' ? true : false)
Logger.setLogLevel(process.env.LOG_LEVEL ? process.env.LOG_LEVEL : "INFO")

// Create webserver
const express = require("express")
const app = express()
require("express-ws")(app)

app.use(raw())

app.use((req:Request, res:Response, next:NextFunction) => {

  //Log the request                                                
  res.on('finish', ()=>{                                   
      //Log the response                                   
      Logger.logResponse(req.url, req.method, res.statusCode)                                                                  
  })

  next()
})

await createRouter(app, {
  additionalMethods: [ "ws" ]
})

Logger.info("Server is listening on http://localhost:3000")
app.listen(3000)

