import Logger from "@iglu-sh/logger";
import type {NodeChannelMessage} from "@iglu-sh/types/controller";
import {createClient} from 'redis';
import { env } from "@/env";
export function buildDeregisterMsg(
    nodeId:string,
): NodeChannelMessage {
    return {
        type: 'deregister',
        sender: 'controller',
        target: nodeId,
        data: {}
    }
}
// Create and return a connected Redis client
export async function getRedisClient(){
    const env = env
    const client = createClient({
        url: `redis://${env.REDIS_USER}:${env.REDIS_PASSWORD}@${env.REDIS_HOST}:${env.REDIS_PORT}` 
    })
    client.on('error', (err) => Logger.error(`Redis Client Error ${err}`));
    await client.connect()
    return client
}
