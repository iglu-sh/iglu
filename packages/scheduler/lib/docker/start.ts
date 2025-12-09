import type {builderDatabase} from "@/types/db";
import Docker from "dockerode";
import Logger from "@iglu-sh/logger";
import DockerWrapper from "@/lib/docker/dockerWrapper.ts";
import Redis from "@/lib/redis.ts";
import type {RedisClientType} from "redis";

/*
* This file is responsible for starting the Docker container for a given builder config id
* It **just** starts up the docker and sets things like IP address etc.
* No validation tasks will be performed here, instead those should be done in the calling function (i.e the Redis refresh_queue function)
* @param {string} builderConfigID - The ID of the builder config to start
* @param {string} run_ID - The ID of the run in the database
* @return {Promise<void>}
* @throws {Error} If there is an error in starting the Docker container or if the builder config is not found
* */
export async function start(builderConfigID:number, run_ID:string,node_id:string){
    Logger.info(`Starting Docker container for builder config ID: ${builderConfigID} and run ID: ${run_ID}`);

    // Create a unique Docker container name using the builder config ID and run ID
    const CONTAINER_NAME = `iglu-builder_${builderConfigID}_${run_ID}_${node_id}`;
    //await Redis.dockerStartHandler(run_ID, builderConfigID.toString(), CONTAINER_NAME)

    // Create the Docker container with the specified configuration
    try{
        // FIXME: This does not catch errors properly, needs to be fixed in dockerWrapper.ts
        await DockerWrapper.startBuilder(CONTAINER_NAME, builderConfigID, run_ID, "latest", "DEBUG")
    }
    catch(err){
        Logger.error(`Could not start container with id: ${CONTAINER_NAME}, see debug logs for more details`)
        Logger.debug(`Error: ${err}`)
        // Run the Redis Stop handler
        await Redis.dockerStopHandler(CONTAINER_NAME)
    }
    // This then triggers the docker event listener in lib/docker/events.ts which will handle the rest of the process (i.e sending configs, receiving logs, etc.)
}