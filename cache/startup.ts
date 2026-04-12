import 'dotenv/config'
import Logger from '@/logger';
import type {AvailablePrefixColors} from '@/logger'
import { load_config } from './helpers/load_config';

/*
 * This function runs the startup routine for the cache. It checks the environment variables and creates Database Configuration. It also initizializes the logger.
* */
export default async function startup(){
    Logger.debug('Loading config')
    const config = load_config();

    /*
     * Initializing the logger
    * */
    Logger.setJsonLogging(config.logger.logging_format === 'json')
    if(config.logger.logging_prefix){
        Logger.setPrefix(
    config.logger.logging_prefix, 
     config.logger.logging_prefix_color? 
            config.logger.logging_prefix_color.toUpperCase() as AvailablePrefixColors : undefined
        );
    }
    Logger.setLogLevel(config.logger.log_level.toUpperCase() as 'DEBUG' | 'INFO' | 'WARN' | 'ERROR')
    Logger.info("Logger initialized!");

}

startup()
