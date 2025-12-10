import {api_key} from "./tables/api_key.ts";
import Logger from "@iglu-sh/logger";
import {build_config} from "./tables/build_config.ts";
import {build_log} from "./tables/build_log.ts";

process.env.POSTGRES_USER = "iglu";
process.env.POSTGRES_HOST = "127.0.0.1";
process.env.POSTGRES_DB = "cache";
process.env.POSTGRES_PASSWORD = "iglu";
process.env.POSTGRES_PORT = "5432";
const api_key_test = new api_key()
await api_key_test.init().then(async ()=>{
    Logger.debug('API Key DAO initialized for testing');
    await api_key_test.getData().then((data)=>{
        console.log(data)
    })
})

const build_config_test = new build_config()
await build_config_test.init().then(async()=>{
    Logger.debug('Build Config DAO initialized for testing');
    await build_config_test.getData().then((data)=>{
        console.log(data)
        if(!data[0]) return
        console.log(data[0].builder.cache)
    })
})
const build_log_test = new build_log()
await build_log_test.init().then(async()=>{
    Logger.debug('Build Log DAO initialized for testing');
    await build_log_test.getData().then((data)=>{
        console.log(data)
    })
})