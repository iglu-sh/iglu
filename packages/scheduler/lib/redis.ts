import type {RedisClientType} from "redis";
import Logger from "@iglu-sh/logger";
import type {buildUpdate, controllerStateUpdate, queueEntry} from "@iglu-sh/types/scheduler";
import {start} from "lib/docker/start"
import type {builder_runs, combinedBuilder} from "@iglu-sh/types/core/db";
import DockerWrapper from "@/lib/docker/dockerWrapper.ts";

export default class Redis {
    private static client: RedisClientType
    public static node_id: string
    private static runningBuilders: Array<{
        job_id: string,
        builder_id: string,
        container_id: string
    }> = []
    constructor(client: RedisClientType, node_id: string) {
        Redis.client = client
        Redis.node_id = node_id
    }
    public static setNodeID(node_id: string): void {
        Redis.node_id = node_id
    }
    public static getClient(): RedisClientType {
        return Redis.client
    }
    public static getRunningBuilders(): Array<{
        job_id: string,
        builder_id: string,
        container_id: string
    }> {
        return Redis.runningBuilders
    }

    public static async getBuildConfig(build_config_id:number):Promise<combinedBuilder>{
        // Fetch the builder config from Redis
        const build_config = await Redis.client.json.get(`build_config_${build_config_id}`)
            .then((data: unknown) => {
                return data
            })
            .catch((err)=>{
                Logger.error(`Failed to fetch builder config with ID ${build_config_id} from Redis.`)
                Logger.debug(`Redis Error: ${err}`)
                return null
            })
        if(!build_config){
            throw new Error(`Builder config with ID ${build_config_id} not found in Redis.`)
        }
        return build_config as combinedBuilder
    }

    public static addBuilderToRunning(job_id:string, builder_id:string, container_id:string): void{
        Redis.runningBuilders.push({
            job_id,
            builder_id,
            container_id
        })
        void Redis.checkForNewJobs()
    }
    // Removes the job with the specified job_id from the running builders list and checks for new jobs
    // Returns a boolean if the job was found and removed
    public static async removeJobFromRunning(job_id:string):Promise<boolean>{
        Logger.debug(`Removing build ${job_id} from running builders`)
        const jobIndex = Redis.runningBuilders.findIndex(builder => builder.job_id === job_id);
        let returnValue = true
        if(jobIndex === -1){
            Logger.debug(`Build ${job_id} not found in running builders, nothing to remove`)
            returnValue = false
        }
        Redis.runningBuilders = Redis.runningBuilders.filter(builder => builder.job_id !== job_id);

        await Redis.checkForNewJobs()
        return returnValue
    }
    public static async removeBuilderFromQueue(job_id:string):Promise<void>{
        Logger.debug(`Removing build ${job_id} from queue`)
        // Remove the builder with the specified job_id from the queued builds list in Redis and add it to the running builders list
        await Redis.client.json.get(`node:${Redis.node_id}:queued_builds`).then(async (queued_builds:any) => {
            if(!queued_builds){
                return
            }
            const new_queue = queued_builds.filter((build:any) => build.job_id !== job_id)
            await Redis.client.json.set(`node:${Redis.node_id}:queued_builds`, '.', new_queue)
        })
    }
    /*
    * Checks this node's queued builds in Redis and starts new jobs if possible
    * @returns {Promise<void>}
    * */
    public static async checkForNewJobs():Promise<void>{
        Logger.debug("Checking for new jobs..., Node ID: " + Redis.node_id)
        // Check the node:<node_id>:queued_builds list for new jobs and see if we can start any of them
        // We can only start a new job if we are below the MAX_BUILDS limit
        const max_builds = parseInt(process.env.MAX_BUILDS!)
        if(Redis.runningBuilders.length >= max_builds){
            return
        }

        // Get the queued builds from Redis
        const queued_builders:queueEntry[] = await Redis.client.json.get(`node:${Redis.node_id}:queued_builds`).catch((err) => {
            Logger.error("Failed to fetch queued builders. Is your Redis instance reachable?")
            Logger.debug(`Redis Error: ${err}`)
            return []
        }).then((data: unknown) => {
            if (!data || typeof data !== "object" || !Array.isArray(data)) {
                Logger.warn("No queued builders found or data is in an invalid format.")
                Logger.debug(`Redis response: ${data}`)
                return []
            }
            return data as queueEntry[]
        })

        // If the length is zero then we can just exit
        if(queued_builders.length === 0 || !queued_builders[0]){
            Logger.debug(`No builds in queue.`)
            return
        }

        // If the length is more than zero we call the start function.
        const job_id = queued_builders[0].job_id
        const builder_config_id = queued_builders[0].build_config_id
        await Redis.removeBuilderFromQueue(job_id)

        // Create a run key for this job in Redis
        // The key will be run:<job_id> and will contain an object of type builder_runs
        const plainRunObject:builder_runs = {
            id: parseInt(job_id),
            builder_id: parseInt(builder_config_id),
            status: "running",
            started_at: new Date(), // Dummy date, will not be used by the controller,
            ended_at: null,
            updated_at: new Date(),
            gitcommit: "unknown",
            duration: "0s",
            log: "",
            node_id: ""
        }
        // Store the run object in Redis
        await Redis.client.json.set(`run:${job_id}`, '.', plainRunObject).catch((err)=>{
            Logger.error(`Failed to create run object for job ID ${job_id} in Redis.`)
            // TODO: This should end the job as failed
            Logger.debug(`Redis Error: ${err}`)
        })

        // Start the builder
        start(parseInt(builder_config_id), job_id, Redis.node_id).catch((err:Error)=>{
            Logger.error(`Failed to start builder for job ID ${job_id} with builder config ID ${builder_config_id}.`)
            Logger.debug(`Error: ${err.message}`)
            this.dockerStopHandler(job_id)
        })
    }
    public static async dockerStartHandler(job_id:string, builder_id:string, container_id:string){
        Logger.debug("Running docker start redis hook")
        // Add the job to the running builders list in Redis
        Redis.addBuilderToRunning(job_id, builder_id, container_id)
    }
    /*
     * Handles the exit of a specific container. It removes the Job from the running builders array in redis,
     * and handles all cleanup tasks relating to redis
     */
    public static async dockerStopHandler(container_id:string){
        Logger.debug("Running docker stop redis hook")
        // Reminder: Container ID comprises:
        // iglu-builder_<build_id>_<run_id>_<node_id>
        const JOB_ID = container_id.split("_")[2]
        if(!JOB_ID){
            Logger.error(`Could not get Job ID from Container ID: ${container_id}. This is a bug.`)
            throw new Error(`Could not get Job ID from Container ID: ${container_id}.`)
        }

        const containerWasFound = await Redis.removeJobFromRunning(JOB_ID)
        if(!containerWasFound){
            // If the container was not found in the running builders list, we need to try to send an update to the controller (even in the case of a canceled build which will result in a 423 locked error)
            // This code path is important when the dockerStopHandler is called for a container that was never started properly and thus never added to the running builders list
            const requestObj:controllerStateUpdate = {
                job_id: parseInt(JOB_ID),
                new_state: "failed",
                old_state: "running",
                timestamp: new Date()
            }
            await fetch(`${process.env.CONTROLLER_URL}/api/v1/tasks/state/inform`, {
                method: "POST",
                body: JSON.stringify(requestObj),
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": process.env.NODE_PSK!,
                    "X-IGLU-NODE-ID": Redis.node_id
                }
            })
                .catch((err)=>{
                    Logger.error(`Failed to inform controller about status update for job ID ${JOB_ID}.`)
                    Logger.debug(`Error: ${err.message}`)
                    // We don't throw here as this is not critical for the build process. If the controller doesn't know it'll just remove the job later
                })
                .then((res=>{
                    if(!res || !res.ok){
                        Logger.debug(`Controller responded with an error for status update of job ID ${JOB_ID}. Status: ${res?.status}`)
                    }
                }))
        }
    }

    /*
    * Publishes a build update to redis on the build_updates channel and updates the run:<job_id> key in redis
    * @param { "log" | "status" } type - The type of update to publish (log or status)
    * @param {string} data - The data to publish (log line or status)
    * @param {number} job_id - The ID of the job to publish the update for
    * */
    public static async publishBuildUpdate(type: "log" | "status", data:string, job_id:number):Promise<void>{
        // Get the Object from redis
        const runObject:builder_runs | null = await Redis.client.json.get(`run:${job_id}`).catch((err)=>{
            Logger.error(`Failed to fetch run object for job ID ${job_id} from Redis.`)
            return null
        })
            .then((data: unknown)=>{
                if(!data){
                    return null
                }
                return data as builder_runs
            })
        if(!runObject){
            Logger.warn(`Run object for job ID ${job_id} not found in Redis. This may be normal if the run was already cleaned up already (for example if the build was canceled).`)
            return
        }
        const old_status = runObject.status
        if(type === "log"){
            // Append the log data to the run object
            runObject.log += data + "\n"
        }
        else if(type === "status"){
            // Update the status of the run object
            runObject.status = data as builder_runs["status"]
        }

        // Update the run object in Redis
        await Redis.client.json.set(`run:${job_id}`, '.', runObject).catch((err)=>{
            Logger.error(`Failed to update run object for job ID ${job_id} in Redis.`)
        })

        // Publish the build update to the build_updates channel
        await Redis.client.publish("build_updates", JSON.stringify({
            type: type,
            build_id: job_id.toString(),
            data: runObject
        } as buildUpdate)).catch((err)=>{
            Logger.error(`Failed to publish build update for job ID ${job_id} to Redis.`)
        })

        // If the type is status, after we've updated everything we need to also inform the controller about the job status via REST
        if(type !== "status") return
        Logger.debug("Sending State Update to Controller")
        const requestObj:controllerStateUpdate = {
            job_id: job_id,
            new_state: runObject.status,
            old_state: old_status,
            timestamp: new Date()
        }
        await fetch(`${process.env.CONTROLLER_URL}/api/v1/tasks/state/inform`, {
            method: "POST",
            body: JSON.stringify(requestObj),
            headers: {
                "Content-Type": "application/json",
                "Authorization": process.env.NODE_PSK!,
                "X-IGLU-NODE-ID": Redis.node_id
            }
        })
            .catch((err)=>{
                Logger.error(`Failed to inform controller about status update for job ID ${job_id}.`)
                Logger.debug(`Error: ${err.message}`)
                // We don't throw here as this is not critical for the build process. If the controller doesn't know it'll just remove the job later
            })
            .then((res=>{
                if(!res || !res.ok){
                    Logger.debug(`Controller responded with an error for status update of job ID ${job_id}. Status: ${res?.status}, this may be normal depending on the status code`)
                }
            }))
    }

    // Cancels a build by job_id
    public async cancelBuild(job_id:number):Promise<void>{
        Logger.info(`Cancelling build with Job ID: ${job_id}`)
        // Get the running builders
        const runningBuilders = Redis.getRunningBuilders().filter(r => r.job_id == job_id.toString())
        if(runningBuilders.length === 0 || !runningBuilders[0]){
            Logger.warn(`No running builder found for Job ID: ${job_id}. It may have already finished or not started yet.`)
            return
        }
        // Stop the container for the running builder
        const container_id = runningBuilders[0].container_id
        Logger.info(`Stopping container with ID: ${container_id} for Job ID: ${job_id}`)
        await DockerWrapper.stopBuilder(container_id)
        // We do not need to manually remove the job from the running builders list as the dockerStopHandler will handle that
    }
}