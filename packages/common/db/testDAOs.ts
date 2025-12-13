import {api_key} from "./tables/api_key.ts";
import Logger from "@iglu-sh/logger";
import {build_config} from "./tables/build_config.ts";
import {build_log} from "./tables/build_log.ts";
import {db} from "./index.ts";
import StaticDatabase = db.StaticDatabase;
import {user} from "./tables/user.ts";

process.env.POSTGRES_USER = "iglu";
process.env.POSTGRES_HOST = "127.0.0.1";
process.env.POSTGRES_DB = "cache";
process.env.POSTGRES_PASSWORD = "iglu";
process.env.POSTGRES_PORT = "5432";
const DBCLient = new StaticDatabase()
await DBCLient.connect()
const api_key_test = new api_key(DBCLient)
await api_key_test.init().then(async ()=>{
    Logger.debug('API Key DAO initialized for testing');
    await api_key_test.getData().then((data)=>{
        console.log(data)
    })
})

const build_config_test = new build_config(DBCLient)
await build_config_test.init().then(async()=>{
    Logger.debug('Build Config DAO initialized for testing');
    await build_config_test.getData().then((data)=>{
        console.log(data)
        if(!data[0]) return
        console.log(data[0].builder.cache)
    })
})
const build_log_test = new build_log(DBCLient)
await build_log_test.init().then(async()=>{
    Logger.debug('Build Log DAO initialized for testing');
    await build_log_test.getData().then((data)=>{
        console.log(data)
    })
})

// Fetch all users
const users = new user(DBCLient)
await users.init().then(async()=>{
    Logger.debug('User DAO initialized for testing');
    await users.getData().then(async (data)=>{
        if(!data[0]) return
        // Create a new api key for the first user
        await api_key_test.createNewEntry({
            id: '',
            name: "Test Key",
            hash: "hashed_key_value",
            description: "This is a test API key",
            created_at: new Date(),
            last_used: new Date(),
            user: data[0]
        }).then((res)=>{
            Logger.debug('New API key created:');
            console.log(res.rows[0])
        })
    })
})
await DBCLient.disconnect()