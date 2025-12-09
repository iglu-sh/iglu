import type {NextRequest} from "next/server";
import Redis from "@/lib/redis";
import Logger from "@iglu-sh/logger";
import type {BuildChannelMessage, BuildClaimMessage} from "@iglu-sh/types/controller";
import {z} from "zod";

export async function POST(request:NextRequest){
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
    const node_id = request.headers.get("X-IGLU-NODE-ID")!;
    // Get the node_psk from redis
    const redis = new Redis()
    try{
        const nodeInfo = await redis.getNodeInfo(node_id);
        // Get the node authorization header
        const authHeader = request.headers.get("Authorization");
        if(!authHeader || authHeader !== nodeInfo.node_psk){
            Logger.debug("Job application invalid. Cause: Invalid authorization (node_psk or authHeader missing)")
            await redis.quit()

            return new Response(JSON.stringify({
                message: "Unauthorized",
                cause: "Invalid PSK"
            }), {
                status: 401,
                headers: {
                    "Content-Type": "application/json"
                }
            });
        }
    }
    catch(err){
        await redis.quit()
        Logger.error(`Failed to get node info from redis: ${(err as Error).message}`);
        return new Response(JSON.stringify({
            message: "Unauthorized",
            cause: "Invalid node ID"
        }), {
            status: 401,
            headers: {
                "Content-Type": "application/json"
            }
        });
    }

    // The node is authorized, now look at the body
    const schema = z.custom<BuildChannelMessage>();
    let body:BuildChannelMessage;
    try{
        body = schema.parse(await request.json());
    }
    catch(err){
        Logger.debug("Job application invalid. Cause: Invalid JSON schema");
        return new Response(JSON.stringify({
            message: "Bad Request",
            cause: "Invalid body"
        }), {
            status: 400,
            headers: {
                "Content-Type": "application/json"
            }
        });
    }

    // Everything looks good, now wait for a random time between 0 and 1 second to avoid double builds
    await new Promise((resolve)=>setTimeout(resolve, Math.random() * 1000));

    // Give the update to the node
    await redis.awardJobToNode(node_id, (body.data as BuildClaimMessage).job_id)
        .catch((err:Error)=>{
            Logger.error(`Failed to award job to node: ${err.message}`);
            return new Response(JSON.stringify({
                message: "Internal Server Error",
                cause: "Failed to award update to node"
            }), {
                status: 410,
                headers: {
                    "Content-Type": "application/json"
                }
            });
        })
    return new Response(JSON.stringify({}))
}