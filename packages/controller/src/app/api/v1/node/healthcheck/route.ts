import {type NextRequest, NextResponse} from "next/server";
import {type NodeChannelMessage} from "@iglu-sh/types/controller";
import Logger from "@iglu-sh/logger";
import * as process from "node:process";
import redis from "redis";
import {z} from "zod";

export async function GET(req:NextRequest, res:NextResponse){
    // Check if the request is authenticated
    if(!req.headers.has('Authorization') || req.headers.get('Authorization') !== process.env.NODE_PSK){
        return NextResponse.json({
            'status': 'error',
            'message': 'Unauthorized'
        }, {status: 401});
    }
    Logger.debug('Asking for healthcheck');

    const editor = redis.createClient({
        url: `redis://${env.REDIS_USER}:${env.REDIS_PASSWORD}@${env.REDIS_HOST}:${env.REDIS_PORT}`
    })
    const subscriber = redis.createClient({
        url: `redis://${env.REDIS_USER}:${env.REDIS_PASSWORD}@${env.REDIS_HOST}:${env.REDIS_PORT}`
    })

    // Handle Redis connection errors
    editor.on('error', (err:Error)=>{
        Logger.error(`Redis editor error: ${err.message}`);
    })
    subscriber.on('error', (err:Error)=>{
        Logger.error(`Redis subscriber error: ${err.message}`);
    });
    // Build a health check data structure
    const healthCheckData:{id:string, responded:boolean}[] = []
    subscriber.on('connect', ()=>{
        Logger.debug('Connected to Redis subscriber');

        // Subscribe to the node channel
        void subscriber.subscribe('node', (message:string)=>{
            Logger.debug(`Received ${message} on node channel`);
            const messageData:NodeChannelMessage = JSON.parse(message) as NodeChannelMessage;
            // Verify the message schema
            const schema = z.custom<NodeChannelMessage>()
            const result = schema.safeParse(messageData);
            if(!result.success){
                Logger.error(`Invalid message received on node channel: ${result.error.message}`);
                return;
            }

            // Check if the message is targeted at this controller
            if(messageData.target != 'controller'){
                Logger.debug(`Message not targeted at controller, ignoring`);
                return;
            }

            // Check if the message is a health check response
            if(messageData.type !== 'health_check'){
                Logger.debug(`Message type is not health_check_response, ignoring`);
                return;
            }
            Logger.debug(`Received health check response from node ${messageData.sender}`);
            // Insert that a node has responded
            const id = messageData.sender;
            const index = healthCheckData.findIndex((item)=>item.id === id);
            if(index === -1 || !healthCheckData[index]){
                Logger.error(`Received health check response from unknown node: ${id}`);
                return;
            }
            healthCheckData[index].responded = true;
        })
    })
    editor.on('connect', ()=>{
        Logger.debug('Connected to Redis editor');
    })
    await editor.connect()
    await subscriber.connect()

    if(!editor.isOpen || !subscriber.isOpen){
        Logger.error('Failed to connect to Redis editor or subscriber');
        return NextResponse.json({
            'status': 'error',
            'message': 'Failed to connect to Redis'
        }, {status: 500});
    }

    // Get all the keys starting with node:
    const keys = await editor.keys('node:*').catch((err:Error)=>{
        Logger.error(`Failed to get keys from Redis: ${err.message}`);
        return [];
    });

    for(const key of keys){
        const id = key.split(':')[1]; // Extract the node id from the key
        if(!id){
            Logger.error(`Failed to extract node id from key: ${key}`);
            continue;
        }
        healthCheckData.push({id:id,responded:false});
        const message:NodeChannelMessage = {
            type: 'health_check',
            target: id,
            sender: 'controller',
            data: {}
        }

        // Publish the health check message to the node channel
        await editor.publish('node', JSON.stringify(message)).catch((err:Error)=>{
            Logger.error(`Failed to publish health check message to node channel: ${err.message}`);
        });
    }

    // Wait for 10 seconds for the nodes to respond
    await new Promise(resolve => setTimeout(resolve, 2000));

    Logger.debug('Health check complete, checking responses');
    for(const node of healthCheckData){
        // If the node has not responded, ask the node to deregister itself and remove it from redis
        if(node.responded){
            continue
        }

        Logger.warn(`Node ${node.id} did not respond to health check, asking it to deregister`);
        const deregisterMessage:NodeChannelMessage = {
            type: 'deregister',
            target: node.id,
            sender: 'controller',
            data: {message: 'deregistered'}
        }
        // Publish the deregister message to the node channel
        await editor.publish('node', JSON.stringify(deregisterMessage)).catch((err:Error)=>{
            Logger.error(`Failed to publish deregister message to node channel: ${err.message}`);
        });
        // Remove the node from Redis
        await editor.json.del(`node:${node.id}`).catch((err:Error)=>{
            Logger.error(`Failed to delete node ${node.id} from redis: ${err.message}`);
        });
    }
    Logger.debug(`Health check complete, ${healthCheckData.filter((item)=>item.responded).length} nodes responded, ${healthCheckData.filter((item)=>!item.responded).length} nodes did not respond, total nodes registered: ${keys.length}`);

    // Close the Redis connections
    await editor.quit().catch((err:Error)=>{
        Logger.error(`Failed to close Redis editor: ${err.message}`);
    });
    await subscriber.quit().catch((err:Error)=>{
        Logger.error(`Failed to close Redis subscriber: ${err.message}`);
    });

    return NextResponse.json({
        'status': 'ok'
    })
}
