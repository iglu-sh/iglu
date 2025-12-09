/*
* This file handles tasks related to Redis, such as cleaning up old build jobs from the queue, etc.
* */
import {type NextRequest, NextResponse} from "next/server";
import Redis from "@/lib/redis";
import Logger from "@iglu-sh/logger";
import process from "node:process";
export async function GET(req:NextRequest){
    // Check if the request is authenticated
    if(!req.headers.has('Authorization') || req.headers.get('Authorization') !== process.env.NODE_PSK){
        return NextResponse.json({
            'status': 'error',
            'message': 'Unauthorized'
        }, {status: 401});
    }
    // Build the redis client
    const redis = new Redis()

    // First, check the length of the build queue, if it is 0 just skip the build cleanup part
    const queueLength = await redis.getQueueLength()
    if(queueLength > 0){
        // Cleanup old build jobs from the queue that haven't been claimed in the last 15 minutes
        // TODO: Make this timeout configurable via env var
        const queue = await redis.getQueue()
        const now = Date.now()
        const last15Minutes = now - (15 * 60 * 1000)
        let removedCount = 0
        for(const item of queue){
            if(item.published_at < last15Minutes){
                // Remove this item from the queue
                await redis.removeItemFromQueue(item.job.data.job_id as string)
                removedCount++
            }
        }
        Logger.debug(`Redis queue removed for queue ${queueLength}`)
    }
    return NextResponse.json({})
}