import {type NextRequest, NextResponse} from "next/server";
import type {NodeInfo} from "@iglu-sh/types/scheduler";
import Logger from "@iglu-sh/logger";
import Redis from "@/lib/redis";
import Database from "@/lib/db";
import {z} from "zod"
/*
* This endpoint is used by schedulers to inform the controller about a builder state change.
* It is responsible for receiving the state and then actin upon it.
* Actions include:
* - Updating the builder state in the database
* - Triggering the finishing tasks for the builder
* */
export async function POST(request: NextRequest){
    // Validate that this is a node we know and trust
    const headers = request.headers;
    if(!headers.has("X-IGLU-NODE-ID") || !headers.has("Authorization")){
        Logger.debug("Missing authentication headers in state inform request");
        return
    }
    const node_id = headers.get("X-IGLU-NODE-ID")!;
    const authHeader = headers.get("Authorization")!;
    let node_info:NodeInfo;
    // Get the node info from redis
    const redis = new Redis();
    try{
        node_info = await redis.getNodeInfo(node_id)
        if(authHeader !== node_info?.node_psk){
            Logger.debug(`Unauthorized state inform request from node ID: ${node_id}`);
            throw new Error("Unauthorized state inform request from node ID");
        }
        await redis.quit()
    }
    catch(err){
        await redis.quit()
        Logger.error(`Failed to get node info from redis: ${(err as Error).message}`);
        return new NextResponse(JSON.stringify({error: "Unauthorized"}), {status: 401});
    }
    let body = undefined
    try{
        body = await request.json();
    }
    catch(e){
        Logger.debug("Failed to parse JSON body in state inform request");
        return new NextResponse(JSON.stringify({error: "Invalid JSON body"}), {status: 400});
    }
    console.log(body)
    // Validate the body
    if(!body || typeof body !== "object"){
        Logger.debug("Invalid body in state inform request");
        return new NextResponse(JSON.stringify({error: "Invalid body"}), {status: 400});
    }
    Logger.debug("Parsing schema for state inform request body");
    const controllerStateUpdateSchema = z.object({
        old_state: z.enum(["created", "claimed", "starting", "running", "failed", "success", "aborted"]),
        new_state: z.enum(["created", "claimed", "starting", "running", "failed", "success", "aborted"]),
        timestamp: z.string(),
        job_id: z.number(),
    })
    const parseResult = controllerStateUpdateSchema.safeParse(body);
    Logger.debug(`Schema parse result: ${JSON.stringify(parseResult)}`);
    if(!parseResult.success || !parseResult.data){
        Logger.debug("Invalid body schema in state inform request");
        return new NextResponse(JSON.stringify({error: "Invalid body schema", details: parseResult.error}), {status: 400});
    }

    console.log("Received state update:", parseResult.data);
    // At this point we have a valid body and a trusted node
    const db = new Database()
    const redisJobClient = new Redis()
    try{
        await db.connect()
        // Get the job from the database
        const dbJob = await db.getJob(parseResult.data.job_id);
        // Get the job from redis
        const redisJob = await redisJobClient.getJob(dbJob.id)
        if(!dbJob || !redisJob){
            Logger.debug(`Job ID ${parseResult.data.job_id} not found in database`);
            throw new Error("Job not found");
        }

        // Combine these two to ensure consistency
        dbJob.log = redisJob.log
        dbJob.status = parseResult.data.new_state
        dbJob.updated_at = new Date()
        if(parseResult.data.new_state === "failed" || parseResult.data.new_state === "success" || parseResult.data.new_state === "aborted"){
            dbJob.ended_at = new Date()
            // Also remove the job from redis
            await redisJobClient.finishJob(dbJob.id)
        }
        // Send the update to the database
        await db.updateJob(dbJob.id, dbJob)
        if(parseResult.data.new_state === "failed" || parseResult.data.new_state === "success" || parseResult.data.new_state === "aborted"){
            // Finish the job in the database
            await db.finishJob(dbJob.id, dbJob.status)
        }

        await redisJobClient.quit()
        await db.disconnect()
    }
    catch(err){
        await db.disconnect()
        await redisJobClient.quit()
        Logger.error(`Failed to update state: ${err}`);
        // Depending on the reason, we should return different status codes but for now this works
        return new NextResponse(JSON.stringify({error: "Failed to update state, either this job is already finishd or you're trying to update a job which never existed (spooky)"}), {status: 423});
    }
    return new NextResponse(null, {status: 204});
}