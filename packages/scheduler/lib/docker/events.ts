/*
* Contains functions to register events and handle Docker events.
* */
import Docker from "dockerode";
import type {RedisClientType} from "redis";
import Logger from "@iglu-sh/logger";
import {z} from 'zod'
import * as fs from "node:fs";
import {startupHandler, stopHandler} from "@/lib/docker/eventHelpers.ts";
import Redis from "@/lib/redis.ts";
/*
* @description Registers Docker events and handlers for build start, stop, and error.
* @param {Docker} docker - The Docker instance to register events on.
* @param {RedisClientType} redis - The Redis client to publish events to.
* */
export function registerDockerEvents(
    docker:Docker,
    redis: RedisClientType
){
    docker.getEvents(async (err, data)=>{
        if(err){
            Logger.error(`Error getting Docker events: ${err.message}`);
            throw new Error(`Error getting Docker events: ${err.message}`);
        }
        if(!data){
            Logger.error(`Got empty Docker event stream`);
            throw new Error(`Got empty Docker event stream`);
        }
        Logger.debug(`Docker event stream started successfully`);
        data.on('start', ()=>{
            Logger.debug(`Docker event stream started`);
        })
        data.on('data', async (message:Buffer)=>{
            const node_id = process.env.NODE_ID;
            if(!node_id){
                Logger.error(`NODE_ID environment variable not set, cannot run docker events safely`);
                return;
            }
            // Split the message on newlines to work around multiple json objects being sent at once
            const data = message.toString().trim().split(/\r?\n/);
            for(const msg of data){
                const event = JSON.parse(msg.toString());

                // Confirm that this is a valid Docker event (which it should be but you never know)
                const eventSchema = z.object({
                    'Type': z.enum([
                        "builder",
                        "config",
                        "container",
                        "daemon",
                        "image",
                        "network",
                        "node",
                        "plugin",
                        "secret",
                        "service",
                        "volume"
                    ]),
                    'Action': z.string(),
                    'Actor': z.object({
                        ID: z.string(),
                        Attributes: z.record(z.string(), z.string())
                    }),
                    'scope': z.enum(['local', 'swarm']),
                    'time': z.number(),
                    'timeNano': z.number()
                })
                const parsedEvent = eventSchema.safeParse(event);
                if(!parsedEvent.success){
                    Logger.error(`Invalid Docker event received: ${message.toString()}`);
                    return;
                }

                const parsedEventData = parsedEvent.data;

                // Decide which codepath we want to take based on the event type
                // As of now, we only care about container events, this could change in the future though
                if(parsedEventData.Type !== 'container'){
                    Logger.debug(`Ignoring Docker event of type ${parsedEventData.Type}`);
                    return;
                }

                // Check if this event is related to a container under our management
                // As a reminder, a container name is created according to the following format:
                // iglu-builder_<build_id>_<node_id>
                // So first we need to check if the container name starts with 'iglu-builder_'
                const DOCKER_NAME = parsedEventData.Actor.Attributes.name || '';
                if(!DOCKER_NAME || !DOCKER_NAME.startsWith('iglu-builder')){
                    Logger.debug(`Ignoring Docker event for unrelated container: ${DOCKER_NAME}`);
                    return;
                }

                // Now we check if the event is related to a container that we are managing (i.e a container matching our node_id)
                const CONTAINER_NODE_ID = DOCKER_NAME.split('_')[3];
                if(CONTAINER_NODE_ID !== node_id){
                    Logger.debug(`Ignoring Docker event for iglu_builder ${DOCKER_NAME} not managed by this node`);
                    Logger.error(`Are you running two schedulers on the same node? This is not recommended and should be avoided.`);
                    return;
                }
                // Now we can handle the event based on its action
                if(parsedEventData.Action === 'start'){
                    Logger.debug("Container managed by this scheduler started, running startup hooks")

                    // We now run the builderStartup function to initialize the container and build
                    await startupHandler(docker, DOCKER_NAME, redis)
                        .catch((err)=>{
                            // Kill the container if we fail to run the startup handler
                            // TODO: Handle this better
                            Logger.error(`Failed to run startup handler for container ${DOCKER_NAME}, stopping container.`)
                            Logger.debug(`Error: ${err.message}`)
                            const container = docker.getContainer(DOCKER_NAME);
                            container.stop().catch((stopErr)=>{
                                Logger.error(`Failed to stop container ${DOCKER_NAME} after startup handler failure: ${stopErr.message}`);
                            });
                        })
                }
                else if(parsedEventData.Action === 'die' || parsedEventData.Action === 'stop'){
                    // Once a container stops, we run the stopHandler function to clean up and after that refresh the queue
                    await stopHandler(DOCKER_NAME, parsedEventData.Action)
                }
                else{
                    Logger.debug(`Ignoring Docker event with action ${parsedEventData.Action} for container ${DOCKER_NAME}`);
                }
            }
        })
    })
}