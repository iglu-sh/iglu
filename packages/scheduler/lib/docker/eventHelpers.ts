import Docker from "dockerode";
import type {RedisClientType} from "redis";
import Redis from "@/lib/redis.ts";
import Logger from "@iglu-sh/logger";
import {wsHandler} from "@/lib/websocket/ws-handler.ts";

/*
* @description Handles the Startup of a Docker Container (e.g. build a nixconfig)
* @param {Docker} docker - The Docker instance to use for starting the container.
* @param {RedisClientType} redis - The Redis client to use for publishing events.
* @param {string} container_name - The name of the Docker container to inspect.
* @param {string} actor_id - The ID of the actor that started the container.
* */
export async function startupHandler(docker:Docker, container_name:string, redis: RedisClientType){
    // First, we need to inspect the container to get its details
    const container = docker.getContainer(container_name)
    const container_inspect_data = await container.inspect()
    if(!container_inspect_data){
        throw new Error(`Failed to inspect container ${container_name}`);
    }

    const container_ip_config = container_inspect_data.NetworkSettings.Networks["iglu-nw"];

    if(!container_ip_config){
        Logger.error(`Started builder container not connected to iglu-nw ${container_name}`)
        throw new Error(`Failed to inspect container ${container_name}`);
    }
    const ipAddress = container_ip_config.IPAddress;
    //A builder name looks like this: `iglu-builder_${builderConfigID}_${run_ID}_${node_id}`
    const name_split = container_name.split('_');
    const run_ID = name_split[2];
    const builderConfigID = parseInt(name_split[1] || '-1');
    if(isNaN(builderConfigID) || builderConfigID < 0){
        Logger.error(`Invalid builder config ID for container ${container_name}`)
        throw new Error(`Invalid builder config ID for container ${container_name}`);
    }
    Logger.debug(`Container ${container_name} started, IP Address: ${ipAddress}`);

    /*
    * Startup Logic for a run, this includes sending a buildUpdate on the Redis Build Channel as well as
    * */

    try{
        // Call the redis startup handler so we keep track of its id
        await Redis.dockerStartHandler(run_ID!, builderConfigID.toString(), container_inspect_data.Id)
        // Fetch the builder config from Redis
        const builder_config = await Redis.getBuildConfig(builderConfigID);

        // Send the builder config to the container and register the ws-handler
        // We have to differentiate between darwin and everything else again, if it's darwin, then we need to provide localhost as the ip and the docker mapped port
        // For everything else we have to provide the port 3000 and the internal docker ip
        if(process.platform === "darwin"){
            const mappedPort = container_inspect_data.NetworkSettings.Ports["3000/tcp"]?.[0]?.HostPort;
            const hostIP = container_inspect_data.NetworkSettings.Ports["3000/tcp"]?.[0]?.HostIp;
            if(!mappedPort || !hostIP){
                throw new Error(`Failed to get mapped port for container ${container_name}`);
            }
            await wsHandler(
                "localhost",
                mappedPort,
                builder_config,
                container_inspect_data.Id,
                parseInt(run_ID ?? "0")
            )
        }
        else{
            // For everything else we can just use the internal docker ip
            await wsHandler(
                ipAddress,
                "3000",
                builder_config,
                container_inspect_data.Id,
                parseInt(run_ID ?? "0")
            )
        }
    }
    catch(err){
        Logger.error(`Failed to get builder config for container ${container_name}`)
        Logger.debug(`${err}`)
        throw new Error(`Failed to get builder config for container ${container_name}`);
    }
}
export async function stopHandler(container_name:string, stop_type:"die"|"stop"){
    await Redis.dockerStopHandler(container_name)
}
