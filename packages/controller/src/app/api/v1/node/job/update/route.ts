import type {NextRequest} from "next/server";
import Logger from "@iglu-sh/logger";
import Redis from "@/lib/redis";
import {z} from "zod";
import Database from "@/lib/db";
import type {nodeJobUpdateRequest} from "@iglu-sh/types/scheduler";

/*
* Handles the job update requests from nodes, the post body has to be of type nodeJobUpdateRequest
* */
export async function POST(request:NextRequest){
    // Check node authorization
    // Check for the X-IGLU-NODE-ID header
    if(!request.headers.has("X-IGLU-NODE-ID")){
        Logger.debug("Task request failed with missing X-IGLU-NODE-ID header");
        return new Response(JSON.stringify({message: "Unauthorized"}), {
            status: 401,
            headers: {
                "Content-Type": "application/json"
            }
        });
    }
    if(!request.headers.has("Authorization")){
        Logger.debug("Task request failed with missing Authorization header");
        return new Response(JSON.stringify({message: "Unauthorized"}), {
            status: 401,
            headers: {
                "Content-Type": "application/json"
            }
        })
    }
    const node_id = request.headers.get("X-IGLU-NODE-ID")!;
    const redis = new Redis();
    const node = await redis.getNodeInfo(node_id);
    if(!node){
        Logger.debug(`Task request failed with invalid node ID: ${node_id}`);
        return new Response(JSON.stringify({message:"Unauthorized"}), {
            status: 401,
            headers: {
                "Content-Type": "application/json"
            }
        })
    }
    const authHeader = request.headers.get("Authorization")!;
    if(authHeader !== node.node_psk){
        Logger.debug(`Task request failed with invalid PSK for node ID: ${node_id}`);
        return new Response(JSON.stringify({message:"Unauthorized"}), {
            status: 401,
            headers: {
                "Content-Type": "application/json"
            }
        })
    }

    // Parse the body
    const body = request.body ?? {};

    if(!body){
        Logger.debug(`Task request from node ID: ${node_id} failed with empty body`);
        return new Response(JSON.stringify({message:"Bad Request"}), {
            status: 400,
            headers: {
                "Content-Type": "application/json"
            }
        })
    }
    const saveParsedObject = z.custom<nodeJobUpdateRequest>().safeParse(body)
    if(!saveParsedObject.success){
        Logger.debug(`Task request from node ID: ${node_id} failed with invalid body: ${JSON.stringify(saveParsedObject.error.issues)}`);
        return new Response(JSON.stringify({message: "Not acceptable"}), {
            status: 406,
            headers:{
                "Content-Type": "application/json"
            }
        })
    }

    // Process the job update
    const jobUpdate = saveParsedObject.data;
    Logger.info(`Received job update from node ID: ${node_id} for job ID: ${jobUpdate.build_id}.`);

    // Get the job from the db
    const db = new Database();
    try{
        await db.connect()
        const job_run_db = await db.getJob(parseInt(jobUpdate.build_id))
        let new_val_of_key:string | Date = jobUpdate.value
        if(jobUpdate.key === "ended_at"){
            new_val_of_key = new Date(jobUpdate.value)
        }

        // Fuck this type system
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-explicit-any
        job_run_db[jobUpdate.key] = new_val_of_key as any
        await db.updateJob(parseInt(jobUpdate.build_id), job_run_db);
        await db.disconnect()
    }
    catch(error){
        await db.disconnect()
        Logger.error(`Failed to get job ID: ${jobUpdate.build_id} from DB: ${(error as Error).message}`);
        return new Response(JSON.stringify({message: "Internal Server Error"}), {
            status: 500,
            headers: {
                "Content-Type": "application/json"
            }
        })
    }
}