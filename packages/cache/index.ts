import type {NextFunction, Request, Response} from 'express'
import fs from "fs";
import raw from 'express'
import createRouter from "express-file-routing"
import type {cacheWithKeys} from "./utils/types.d/dbTypes.ts";
import {makeApiKey} from "./utils/apiKeys.ts";
import 'dotenv/config'
import {migrate} from "./utils/migrations.ts";
import Logger from "@iglu-sh/logger";
import {startExporter} from './utils/metric.ts';
import {
    Api_key,
    Cache,
    Cache_api_key_link,
    cache_config, Cache_user_link,
    db,
    Hash,
    Public_signing_key,
    Setup,
    User
} from "@iglu-sh/common"
import type {cache} from "@iglu-sh/types/core/db"
import StaticDatabase = db.StaticDatabase;

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
    if (!process.env[env]) {
        console.error('No ' + env + ' set, please set it in the .env file or your environment')
        process.exit(1)
    }
})

//Set the log level
Logger.setPrefix("cache", "RED")
Logger.setJsonLogging(!!(process.env.JSON_LOGGING && process.env.JSON_LOGGING.toLowerCase() === 'true'))

//Default to info if the LOG_LEVEL is not set or invalid
if (!process.env.LOG_LEVEL) {
    process.env.LOG_LEVEL = "INFO"
}

//Default enable Prometheus
if (!process.env.PROM_ENABLE) {
    process.env.PROM_ENABLE = "false"
}

if (!["DEBUG", "INFO", "WARN", "ERROR"].includes(process.env.LOG_LEVEL.toUpperCase() as string)) {
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

let Database:db.StaticDatabase;
process.on('exit', async()=>{
    Logger.info("Shutting down cache server...")
    await Database.disconnect()
})
async function startDB() {
    let isReady = false
    Database = new db.StaticDatabase()
    while (!isReady) {
        try {
            Database = db.StaticDatabase
            await Database.connect()
            isReady = true
        } catch (e) {
            Logger.error(`Error whilst connecting to Database, is your Server up? Waiting 5 Seconds to retry ${e}`)
            //Destroy the Database instance to prevent memory leaks and to avoid a bug with reconnecting client
            await Database.disconnect()
            //Wait for 5 seconds
            await new Promise((resolve) => setTimeout(resolve, 5000))
        }
    }
    // Create the database if it does not exist
    await new Setup(Database).createDatabase()

    const caches = new Cache(Database)
    const apiKey = new Api_key(Database)
    const cacheApiKeyLink = new Cache_api_key_link(Database)
    const user = new User(Database)
    const user_cache_link = new Cache_user_link(Database)
    const publicSigningKey = new Public_signing_key(Database)
    await caches.init()
    await apiKey.init()
    await publicSigningKey.init()
    await cacheApiKeyLink.init()
    await user.init()
    const user_list = await user.getData()

    // If there are no users, create a default admin user
    if(user_list.length === 0){
        Logger.info("No users found, creating default admin user")
        await user.createNewEntry({
            id: "<empty>",
            username: "admin",
            email: "admin@example.com",
            password: "admin",
            is_admin: true,
            last_login: new Date(),
            is_verified: true,
            must_change_password: true,
            show_oob: true,
            createdat: new Date(),
            updatedat: new Date(),
            avatar_color: "#FF0000",
            avatar: Buffer.from("")
        }).then((res)=>{
            if(!res.rows[0]) throw new Error("Could not create default admin user")
            return res.rows[0]
        })

        // Re-fetch the users
        await user.init()
    }
    await caches.getData().then(async (caches_list: Array<cache>) => {
        if (caches_list.length === 0) {
            //Create a default cache
            Logger.info('No caches found, creating default cache')
            await caches.createNewEntry({
                id: "empty",
                "githubusername": "",
                "ispublic": true,
                "name": "default",
                "permission": "Read",
                "preferredcompressionmethod": "xz",
                "uri": `${process.env.CACHE_ROOT_DOMAIN}`,
                "priority": 40
            })

            // Assign the default cache to the admin user
            const defaultCache = await caches.getByName("default")
            const adminUser = await user.getByUsername("admin")
            await user_cache_link.createNewEntry({
                id: "<empty>",
                cache: defaultCache,
                user: adminUser
            })
        }
        // Re-fetch caches
        await caches.init()
        caches_list = await caches.getData()
        for (const cache of caches_list) {
            //Updating CACHE_ROOT_DOMAIN if needed
            if (cache.uri != process.env.CACHE_ROOT_DOMAIN && process.env.AUTO_FIX_CACHE_ROOT_DOMAIN !== "false") {
                Logger.debug("Updating CACHE_ROOT_DOMAIN for cache \"" + cache.name + "\"")
                await caches.modifyEntry({
                    ...cache,
                    uri: process.env.CACHE_ROOT_DOMAIN as string
                })
            }
            const keysForCache = await cacheApiKeyLink.getByCacheId(cache.id)
            if (keysForCache.length === 0) {
                Logger.debug(`Cache ${cache.name} has no API keys, creating one`)
                const newKey = makeApiKey()
                Logger.info(`Initial Key for cache ${cache.name}: ${newKey}`)
                try {
                    // Try to get the default admin user (the one with the admin username) and assign the key to them
                    const adminUser = await user.getByUsername("admin").catch(()=>{
                        Logger.warn("Default admin user not found, assigning cache key to first user in database")
                        return user_list[0]
                    })
                    if(!adminUser){
                        throw new Error("No users found in database to assign cache key to")
                    }
                    let createdKey = await apiKey.createNewEntry({
                        id: "<empty>",
                        name: `Initial key for cache ${cache.name}`,
                        hash: newKey,
                        description: `Initial key for cache ${cache.name}`,
                        user: adminUser,
                        created_at: new Date(),
                        last_used: new Date()
                    }).then((res)=>{
                        if(!res.rows[0]) throw new Error("Could not create API key for cache " + cache.name)
                        return res.rows[0]
                    })
                    await apiKey.init()

                    // Add the key to the cache
                    await apiKey.createCacheKeyEntry(await apiKey.getById(createdKey.id), cache)
                } catch (e) {
                    Logger.error(`Error whilst appending: ${e}`)
                    return -1
                }
            }
            const keysAssociatedWithCache = await publicSigningKey.getByCacheId(cache.id)
            //Check the public signing keys and "create" a default one
            if (keysAssociatedWithCache.length === 0) {
                Logger.info(`No public signing keys found for cache ${cache.name}, create one by using the cachix generate-keypair command using your api key`)
            }
            //Show the public signing key for this cache
            Logger.debug(`Public signing keys for cache ${cache.name}: ${keysAssociatedWithCache.map((key) => key ? "<empty>" : key).join(", ")}`)
        }
    })

    const hashes = new Hash(Database)
    await hashes.init()

    //Check if there are "dangling" paths in the nar_file directory (i.e paths that are not in the database) and part files
    for (const pathObj of await hashes.getData()) {
        if (!fs.existsSync(pathObj.path)) {
            Logger.debug(`Path ${pathObj.path} exists in database but not in filesystem, removing from database`)
            //Delete the path from the database
            await hashes.deleteById(pathObj.id)
            continue
        }

        //Check how big the file is
        const stats = fs.statSync(pathObj.path);
        const fileSizeInBytes = stats.size;
        if (fileSizeInBytes === 0) {
            Logger.debug(`Path ${pathObj.path} is empty, removing from database and unlinking`)
            //Delete the path from the database
            await hashes.deleteById(pathObj.id)
            //Unlink the file
            fs.unlinkSync(pathObj.path)
        }

    }
    //Check if there are leftover parts in the nar_file directory
    Logger.debug("Checking for leftover part files in nar_files directory")
    for (const cache of await caches.getData()) {
        const cacheDir = `${process.env.CACHE_FILESYSTEM_DIR}/nar_files/${cache.name}`
        if (!fs.existsSync(cacheDir)) {
            continue
        }
        const files = fs.readdirSync(cacheDir)
        for (const file of files) {
            //Check if the file is a file that ends with a number instead of .xz or .zstd
            if (!file.endsWith('.xz') && !file.endsWith('.zstd')) {
                Logger.debug(`Part file ${file} found, removing`)
                fs.unlinkSync(`${cacheDir}/${file}`)
            }
        }
    }
    Logger.debug("Database setup complete, starting server")
}

if (process.env.NO_DB !== "true") {
    await startDB()
}

if (process.env.PROM_ENABLE === "true") {
    startExporter()
}

app.use(raw())

//Log requests
app.use((req: Request, res: Response, next: NextFunction) => {
    //Log the request
    res.on('finish', () => {
        //Log the response
        Logger.logResponse(req.url, req.method, res.statusCode)
    })
    next()
})
await createRouter(app, {
    additionalMethods: ["ws"]
})
app.use((req: Request, res: Response) => {
    //req.log.info(req.url)
    Logger.logRequest(`[CATCHALL] ${req.url}`, req.method)
    res.status(200).send('OK');
});

app.listen(3000)
// check if CACHE_ROOT_DOMAIN is set correctly
for (let i = 0; i <= 5; i++) {
    if (i == 5) {
        Logger.error("Invalid 'CACHE_ROOT_DOMAIN' ENV could not be reached!")
        process.exit(1)
    }

    try {
        const test = await fetch(process.env.CACHE_ROOT_DOMAIN + "/api/v1/healthcheck")
        if (test.status != 200) {
            Logger.warn("Can't reach 'CACHE_ROOT_DOMAIN'!")
        } else {
            break
        }
    } catch (e) {
        Logger.warn("Can't reach 'CACHE_ROOT_DOMAIN'!")
    }
    await new Promise((r) => setTimeout(r, 5000))
}
