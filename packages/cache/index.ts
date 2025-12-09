import type {NextFunction, Request, Response} from 'express'
import fs from "fs";
import raw from 'express'
import db from "./utils/db";
import createRouter from "express-file-routing"
import type {cacheWithKeys} from "./utils/types.d/dbTypes.ts";
import {makeApiKey} from "./utils/apiKeys.ts";
import 'dotenv/config'
import {migrate} from "./utils/migrations.ts";
import Logger from "@iglu-sh/logger";
import { startExporter } from './utils/metric.ts';
import {start} from 'repl';
import {exit} from 'process';

const app = require('express')()

let envs = [
    "CACHE_ROOT_DOMAIN",
    "CACHE_FILESYSTEM_DIR",
    "POSTGRES_DB",
    "POSTGRES_USER",
    "POSTGRES_HOST",
    "POSTGRES_PASSWORD",
    "POSTGRES_PORT"
];

envs.forEach(env => {
  if(!process.env[env]){
    console.error('No ' + env + ' set, please set it in the .env file or your environment')
    process.exit(1)
  }
})

//Set the log level
Logger.setPrefix("cache", "RED")
Logger.setJsonLogging(!!(process.env.JSON_LOGGING && process.env.JSON_LOGGING.toLowerCase() === 'true'))

//Default to info if the LOG_LEVEL is not set or invalid
if(!process.env.LOG_LEVEL){
    process.env.LOG_LEVEL = "INFO"
}

//Default enable Prometheus
if(!process.env.PROM_ENABLE){
    process.env.PROM_ENABLE = "false"
}

if(!["DEBUG", "INFO", "WARN", "ERROR"].includes(process.env.LOG_LEVEL.toUpperCase() as string)){
    process.env.LOG_LEVEL = "INFO"
}
//@ts-ignore
Logger.setLogLevel(process.env.LOG_LEVEL.toUpperCase() as "DEBUG" | "INFO" | "WARN" | "ERROR")


// Print config
console.log("----------CONFIG----------")
console.log("Database Host:\t" + process.env.POSTGRES_HOST)
console.log("Database Port:\t" + process.env.POSTGRES_PORT)
console.log("Database User:\t" + process.env.POSTGRES_USER)
console.log("Database DB:\t" + process.env.POSTGRES_DB)
console.log("Root Domain:\t" + process.env.CACHE_ROOT_DOMAIN)
console.log("Filesystem Dir:\t" + process.env.CACHE_FILESYSTEM_DIR)
console.log("\n\n\n")

async function startDB(){
  let isReady = false
  let Database: db = new db();
  while(!isReady){
      try {
          Database = new db()
          await Database.connect()
          isReady = true
      }
      catch(e){
          Logger.error(`Error whilst connecting to Database, is your Server up? Waiting 5 Seconds to retry ${e}`)
          //Destroy the Database instance to prevent memory leaks and to avoid a bug with reconnecting client
          await Database.destroy()
          //Wait for 5 seconds
          await new Promise((resolve) => setTimeout(resolve, 5000))
      }
  }
  await Database.setupDB();

  //Insert the default cache if it does not exist
  await Database.insertServerSettings(
      process.env.CACHE_FILESYSTEM_DIR!,
      process.env.LOG_LEVEL!,
      process.env.CACHE_ROOT_DOMAIN!
  )

  await Database.getAllCaches().then(async (caches:Array<cacheWithKeys>)=>{
      if(caches.length === 0){
          //Create a default cache
          Logger.info('No caches found, creating default cache')
          await Database.createCache("default", "Read", true, "none", "XZ", `${process.env.CACHE_ROOT_DOMAIN}`)
      }
      caches = await Database.getAllCaches()
      //Run migrations
      await migrate(Database);
      for (const cache of caches) {
          //Updating CACHE_ROOT_DOMAIN if needed
          if(cache.uri != process.env.CACHE_ROOT_DOMAIN && process.env.AUTO_FIX_CACHE_ROOT_DOMAIN !== "false"){
            Logger.debug("Updating CACHE_ROOT_DOMAIN for cache \"" + cache.name + "\"")
            await Database.updateCacheURI(process.env.CACHE_ROOT_DOMAIN, cache.id)
          }
          if(cache.allowedKeys.length === 0 || cache.allowedKeys[0] === null || cache.allowedKeys[0] === "NULL"){
              const cacheKey = makeApiKey(cache.name)
              Logger.info(`Initial Key for cache ${cache.name}: ${cacheKey}`)
              try{
                  let newHash = await Database.appendApiKey(cache.id, cacheKey)
                  //Add this key to the cache
                  cache.allowedKeys[0] = newHash
              }
              catch(e) {
                  Logger.error(`Error whilst appending: ${e}`)
                  return -1
              }
          }
          //Check the public signing keys and "create" a default one
          if(cache.publicSigningKeys.length === 0 || cache.publicSigningKeys[0] === null){
              Logger.debug(`No public signing keys found for cache ${cache.name} creating placeholder`)
              //Get the first api key available in the database
              const apiKey = cache.allowedKeys[0]
              if(!apiKey) continue

              //Create a new public signing key
              await Database.appendPublicKey(cache.id, "<empty>",  apiKey, true)
          }
          //Show the public signing key for this cache
          Logger.debug(`Public signing keys for cache ${cache.name}: ${cache.publicSigningKeys.map((key)=>key == "" ? "<empty>" : key).join(", ")}`)
      }
  })

  //Check if there are "dangling" paths in the nar_file directory (i.e paths that are not in the database) and part files
  const paths = await Database.getDirectAccess().query(`
      SELECT path, id FROM cache.hashes 
  `)
  for(const pathObj of paths.rows){
      if(!fs.existsSync(pathObj.path)){
          Logger.debug(`Path ${pathObj.path} does not exist in database, removing from database`)
          //Delete the path from the database
          await Database.getDirectAccess().query(`
              DELETE FROM cache.request WHERE hash = ${pathObj.id}
          `)
          await Database.deletePath(pathObj.id)

          continue
      }

      //Check how big the file is
      const stats = fs.statSync(pathObj.path);
      const fileSizeInBytes = stats.size;
      if(fileSizeInBytes === 0){
          Logger.debug(`Path ${pathObj.path} is empty, removing from database and unlinking`)
          //Delete the path from the database
          await Database.deletePath(pathObj.id)
          //Unlink the file
          fs.unlinkSync(pathObj.path)
      }

  }
  //Check if there are leftover parts in the nar_file directory
  for(const cache of await Database.getAllCaches()){
      const cacheDir = `${process.env.CACHE_FILESYSTEM_DIR}/nar_files/${cache.name}`
      if(!fs.existsSync(cacheDir)){
          continue
      }
      const files = fs.readdirSync(cacheDir)
      for(const file of files){
          //Check if the file is a file that ends with a number instead of .xz or .zstd
          if(!file.endsWith('.xz') && !file.endsWith('.zstd')){
              Logger.debug(`Part file ${file} found, removing`)
              fs.unlinkSync(`${cacheDir}/${file}`)
          }
      }
  }

  await Database.close()
}

if(process.env.NO_DB !== "true"){
  await startDB()
}

if(process.env.PROM_ENABLE === "true"){
  startExporter()
}

app.use(raw())

//Log requests
app.use((req:Request, res:Response, next:NextFunction)=>{
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
app.use((req:Request, res:Response) => {
    //req.log.info(req.url)
    Logger.logRequest(`[CATCHALL] ${req.url}`, req.method)
    res.status(200).send('OK');
});

app.listen(3000)

// check if CACHE_ROOT_DOMAIN is set correctly
for(let i = 0; i <= 5; i++){
  if(i == 5){
    Logger.error("Invalid 'CACHE_ROOT_DOMAIN' ENV could not be reached!")
    process.exit(1)
  }

  try{
    const test = await fetch(process.env.CACHE_ROOT_DOMAIN + "/api/v1/healthcheck")
    if(test.status != 200){
      Logger.warn("Can't reach 'CACHE_ROOT_DOMAIN'!")
    }else{
      break
    }
  }catch(e){
    Logger.warn("Can't reach 'CACHE_ROOT_DOMAIN'!")
  }
  await new Promise((r) => setTimeout(r, 5000))
}
