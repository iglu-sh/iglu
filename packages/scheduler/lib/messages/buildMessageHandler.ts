import type {arch, BuildChannelMessage, BuildClaimResponse, BuildQueueMessage} from "@iglu-sh/types/controller";
import type {queueEntry} from "@iglu-sh/types/scheduler";
import Logger from "@iglu-sh/logger";
import type {RedisClientType} from "redis";
import Redis from "@/lib/redis.ts";

export default async function processMessage(message: BuildChannelMessage, node_id:string, arch:arch, editor:RedisClientType, node_psk:string): Promise<void> {
    // We can immediately ignore messages sent by ourselves OR messages not intended for us OR messages that have the type of claim (not handled by nodes)
    if(
        message.type === "build" ||
        message.sender === node_id ||
        (message.target !== null && message.target !== node_id)
    ) {
        Logger.debug(`Ignoring message from ${message.sender} to ${message.target} of type ${message.type} as it is not relevant to this node (${node_id})`)
        return
    }

    // Determine the type of message and process accordingly
    if(message.type === "queue"){
        // If the type is queue, we either have a new build or a cancelled build
        if((message.data as BuildQueueMessage).type === "cancel"){
            // Cancelled build - Publish a cancelled message to the build channel
            // Cancels the build provided, i.e we are going to kill the build if we are building it or remove it from our queue if we are not building it yet
            const data = message.data as BuildQueueMessage
            Logger.warn(`Got order to cancel build ${data.job_id}`)
            // Remove the build from our queue in Redis
            const redisHelper = new Redis(editor as RedisClientType, node_id);
            await redisHelper.cancelBuild(parseInt(data.job_id));
        }
        if((message.data as BuildQueueMessage).type === "add"){
            const data = message.data as BuildQueueMessage
            // New build - Add the build to the queue in Redis
            Logger.debug(`Got new build message for build ${data.job_id}`)

            // Check if we can even build this job

            // Get our current arch
            // We need to first look at if cross-compilation is turned on
            const supportedArchsForCrossCompile:arch[] = ['x86_64-linux', 'aarch64-linux'];
            let thisNodeSupports = [arch]
            if(process.env.CROSS_COMPILE === 'true'){
                // Add the supported archs for cross compilation
                thisNodeSupports = supportedArchsForCrossCompile
            }
            if(arch !== data.arch && (process.env.CROSS_COMPILE === "true" && !thisNodeSupports.includes(data.arch))){
                Logger.debug(`Not applying for build ${data.job_id} as it is for arch ${data.arch} and we are ${arch}. You may want to enable cross compilation if you want to build for other architectures.`)
                return
            }
            Logger.info(`Applying for build ${data.job_id} for arch ${data.arch}`)
            // Get our current queued builds
            const currentQueuedBuilds = await editor.json.get(`node:${node_id}:queued_builds`) as Array<queueEntry>

            // We set a limit of the maximum number of running builds for the queue as well just so we don't get overwhelmed with queued builds and give other nodes a chance to pick up builds
            if(currentQueuedBuilds.length >= parseInt(process.env.MAX_BUILDS!)){
                Logger.debug(`Not applying for build ${data.job_id} as we are already at our max job limit of ${process.env.MAX_BUILDS!}`)
                return
            }

            // At this point, we can apply for the build
            // This is done by getting all the info of the build from the controller and sending a message to the controller endpoint:
            // /api/v1/node/job/apply with the body of type BuildClaimMessage
            // The request contains the node_id as X-IGLU-NODE-ID header and the node_psk as the Authorization header
            const claimMessage:BuildChannelMessage = {
                type: "claim",
                sender: node_id,
                target: "controller",
                data: {
                    type: "claim",
                    builder_id: data.builder_id,
                    job_id: data.job_id
                }
            }

            Logger.debug(`Using PSK: ${node_psk} to apply for build ${data.job_id}`)
            // Send the request to the controller
            fetch(`${process.env.CONTROLLER_URL}/api/v1/node/job/apply`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-IGLU-NODE-ID": node_id,
                    "Authorization": node_psk
                },
                body: JSON.stringify(claimMessage)
            }).catch((err)=>{
                Logger.debug(`Fetch failed with error: ${(err as Error).message}, job is probably gone`);
            })
        }
    }
    if(message.type === "claim"){
        if((message.data as BuildClaimResponse).type !== "claim_response"){
            Logger.debug(`Ignoring claim message with invalid data type ${(message.data as BuildClaimResponse).type}`);
            return;
        }

        // If the type is claim, we will probably have a claim response
        const data:BuildClaimResponse = message.data as BuildClaimResponse
        if(data.result !== "approved"){
            Logger.debug(`Did not get approval for build ${data.job_id}, response was ${data.result}`);
            return;
        }
        Logger.info(`Got approval for build ${data.job_id}, adding to queue`);

        // Add the build to the queue in Redis
        await editor.json.arrAppend(`node:${node_id}:queued_builds`, "$", {
            job_id: data.job_id,
            build_config_id: data.builder_id,
        } as queueEntry).then(()=>{
            Logger.debug(`Builder with ID ${data.job_id} inserted into node queue ${node_id}`)
        })

        // Wait a second to ensure the above operation completes before we check for new jobs
        await new Promise(resolve => setTimeout(resolve, 1000));
        await Redis.checkForNewJobs()
    }
}