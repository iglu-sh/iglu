import {NextRequest, NextResponse} from "next/server";
import Database from "@/lib/db";
import Logger from "@iglu-sh/logger";
import Redis from "@/lib/redis";

export async function GET(request:NextRequest, {params}:{params:{hook:string}}){
    const {hook} = await params
    // Fetch the builder
    const db = new Database()
    let builder = null
    let buildJob = null
    try{
        await db.connect()
        builder = await db.getBuilderFromWebhook(hook)
        if(builder){
            // Create a new build update in the database
            buildJob = await db.createNewBuildJob(builder.id)
        }
        await db.disconnect()
    }
    catch(e){
        Logger.error(`Error in webhook request: ${e}`)
        await db.disconnect()
    }

    if(builder === null || buildJob === null){
        return NextResponse.json({
            'error': 'Builder not found'
        }, {status: 404})
    }

    // Publish build to redis
    let published = false
    try{
        const redis = new Redis()
        await redis.advertiseNewBuildJob(buildJob.id.toString(), builder.id.toString())
            .then(()=>{
                published = true
                Logger.debug(`Published build job ${buildJob?.id} to Redis`)
            })
            .catch((e)=>{
                published = false
                Logger.error(`Failed to publish build job ${buildJob?.id} to Redis`)
                Logger.debug(`Redis publish error: ${e}`)
            })
        await redis.quit()
    }
    catch (e) {
        Logger.error(`Error in webhook request: ${e}`)
        published = false
    }

    if(!published){
        return NextResponse.json({
            'error': 'Failed to publish build to queue'
        }, {status: 500})
    }

    return NextResponse.json(builder)
}