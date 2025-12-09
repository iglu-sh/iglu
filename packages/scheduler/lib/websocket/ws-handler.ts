// Listens to a websocket on the specified port and ip address
import type {combinedBuilder} from "@iglu-sh/types/core/db";
import type {wsMsg} from "@iglu-sh/types/builder/websocket.ts"
import Logger from "@iglu-sh/logger";
import DockerWrapper from "@/lib/docker/dockerWrapper.ts";
import Redis from "@/lib/redis.ts";

export async function wsHandler(ip:string, port:string, builderConfig:combinedBuilder, dockerID:string, job_id:number){
    // First, check if the healthcheck endpoint is reachable
    // We will try 5 times with a delay of 2 seconds between each try
    let isReachable:boolean = false;
    let retryCount = 0;
    // TODO: throw error if retry count was exceeded
    while(!isReachable && retryCount < 5){
        try{
            await fetch(`http://${ip}:${port}/api/v1/healthcheck`).then((res)=>{
                if(res.ok){
                    isReachable = true;
                    Logger.debug(`Healthcheck endpoint reachable for builder ${job_id} after ${retryCount} retries.`);
                }
            })
        }
        catch(e){
            Logger.debug(`Healthcheck endpoint not reachable for builder ${job_id}, retrying...`);
        }
        if(!isReachable){
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    Logger.debug(`Sending build config ${builderConfig.builder.id} to ws://${ip}:${port}/api/v1/build`);

    // Update the builder status to "starting"
    await Redis.publishBuildUpdate("status", "starting", job_id);
    const ws = new WebSocket(`ws://${ip}:${port}/api/v1/build`);

    // On open we just send the builder config and update the status to running
    ws.onopen = async (event) => {
        Logger.debug(`Websocket Connection opened for builder ${job_id}`);
        ws.send(JSON.stringify(builderConfig));
        await Redis.publishBuildUpdate("status", "running", job_id);
        Logger.info(`Build config ${builderConfig.builder.id} sent to builder at ws://${ip}:${port}/api/v1/build`);
    }

    // On message we push the message to the Redis build update channel
    ws.onmessage = async (event) => {
        const message:wsMsg = JSON.parse(event.data);
        // Everything else means that we just log the message for now
        Logger.debug(`Websocket Message from builder ${job_id}: ${message.jobStatus}`);
        // Publish the build update to Redis
        // All the parsing logic lives in the controller
        await Redis.publishBuildUpdate("log", event.data, job_id);
    }

    // On close we need to check the code and determine if the build was successful or not
    ws.onclose = async (event) => {
        Logger.debug(`Websocket Connection closed for builder ${job_id} with code ${event.code}`);
        // When the websocket closes, we need to look at the code and determine if we need to mark the build as failed
        // The code 1000 signals a normal closure which means that the build finished successfully
        // The codes 1007 and 1011 signal that the builder closed the connection due to an error, in which case we set the build status to failed
        if(event.code === 1000){
            Logger.info(`Builder ${job_id} finished successfully.`);
            await Redis.publishBuildUpdate("status", "success", job_id);
        }
        else{
            Logger.warn(`Builder ${job_id} closed connection with error code ${event.code}, marking build as failed.`);
            await Redis.publishBuildUpdate("status", "failed", job_id);
        }
        // Ensure the container is stopped
        await DockerWrapper.stopBuilder(dockerID)
    }

    // On error we don't do anything really
    ws.onerror = (event) => {
        // This usually is the case when the builder crashes or similar.
        // The onclose event will be called after this, so we don't need to do anything here
        Logger.debug(`Error in Websocket Connection for builder ${job_id}: ${JSON.stringify(event)}`);
    }
}