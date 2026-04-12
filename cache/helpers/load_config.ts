import { load } from 'js-toml'
import {z} from 'zod'
import {readFileSync} from 'node:fs'
import Logger from '@/logger'

export type config = {
    database: {
        database_type: 'sqlite' | 'postgres',
        database_file_location: string
    },
    logger: {
        logging_format: 'pretty' | 'json',
        log_level: 'debug' | 'info' | 'warn' | 'error'
        logging_prefix?: string | undefined
        logging_prefix_color?: 'gray' | 'green' | 'yellow' | 'red' | 'blue' | 'magenta' | 'cyan' | 'white'
    }
}

export const config_schema = z.object({
    database: z.object({
        database_type: z.enum(['sqlite', 'postgres']),
        database_file_location: z.string()
    }),
    logger: z.object({
        logging_format: z.enum(['pretty', 'json']),
        log_level: z.enum(['debug', 'info', 'warn', 'error']),
        logging_prefix: z.string().optional(),
        logging_prefix_color: z.enum(['gray', 'green', 'yellow', 'red', 'blue', 'magenta', 'cyan', 'white']).optional()
    })
}) 

/**
 * @description - Loads the config (at config.toml), parses it and validates it's schema, then returns it
 * @throws - On faulty config (wrong keys, wrong values, etc.)
 * @returns {config} - The Config Data
* */
export function load_config():config{
    const tomlString = readFileSync('./config.toml').toString()
    const config = load(tomlString)
    const zod_schema_result = config_schema.safeParse(config)
    if(!zod_schema_result.data || !zod_schema_result.success){
        Logger.error('Panic(cache::startup::helpers::load_config):Did not successfully validate config schema, please check your config and try again')
        Logger.info('Here are the errors I found with your config:')
        console.log(zod_schema_result.error.issues)
        throw new Error('Panic(cache::startup::helpers::load_config):Did not successfully validate config schema, please check your config and try again')
    }
    return zod_schema_result.data
}
