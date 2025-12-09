import Logger from "@iglu-sh/logger";
import {z} from 'zod'
import type {nodeRegistrationRequest, nodeRegistrationResponse} from "@iglu-sh/types/scheduler";
import {createClient} from "redis";
import type {arch} from "@iglu-sh/types/controller";

/*
* This file is responsible for starting the scheduler.
* */
export async function startup(){
    // Set initial log level until environment variables are validated
    Logger.setLogLevel('DEBUG')
    Logger.info('Starting scheduler...');

    // Validate environment variables
    Logger.debug("Checking environment variables...");
    const envSchema = z.object({
        PORT: z.string().optional().default('3000'),
        INTERFACE: z.string().optional().default('localhost'),
        AUTH_TOKEN: z.string().optional().default(Bun.randomUUIDv7()),
        NODE_NAME: z.string().optional().default('scheduler'),
        MAX_BUILDS: z.string().optional().default('5'),
        CONTROLLER_REGISTRATION_KEY: z.string(),
        LOG_LEVEL: z.enum(["DEBUG", "INFO", "WARN", "ERROR"]).optional().default('DEBUG'),
        LOGGER_FORMAT: z.enum(["pretty", "json"]).optional().default('pretty'),
        CONTROLLER_URL: z.string(), //The base url of the controller (e.g 'http://localhost:3000'). URLs will be constructed from this
        REDIS_HOST: z.string(),
        REDIS_USER: z.string().optional().default('default'),
        REDIS_PASSWORD: z.string().optional().default('default'),
        REDIS_PORT: z.string().optional().default('6379'),
        DOCKER_SOCKET: z.string(),
        CROSS_COMPILE: z.enum(['true', 'false']).optional().default('false'),
        DOCKER_IMAGE: z.string().optional().default('ghcr.io/iglu-sh/iglu-builder:latest'),

        DOCKER_MODE: z.string().optional().default("false"),
    });
    const env = envSchema.safeParse(process.env);
    if (!env.success) {
        Logger.error(`Invalid environment variables: ${env.error.message}`);
        throw new Error("Invalid environment variables");
    }
    Logger.setJsonLogging(env.data.LOGGER_FORMAT === 'json')
    let arch = process.arch.includes('x64') ? `x86_64-${process.platform}` : process.arch
    if(arch === 'arm64'){
        arch = `aarch64-${process.platform}`
    }
    process.env.ARCH = arch
    process.env.DOCKER_IMAGE = env.data.DOCKER_IMAGE
    // Check if the CROSS_COMPILE flag is true and if we are on a supported architecture
    if(env.data.CROSS_COMPILE === 'true'){
        // Supported architectures are x86_64-linux and aarch64-linux
        const supportedArchs = ['x86_64-linux', 'aarch64-linux'];
        if (!supportedArchs.includes(arch)) {
            Logger.error("CROSS_COMPILE is set to true but the current architecture is not supported / implemented for cross compilation. Supported architectures are x86_64-linux and aarch64-linux. Current architecture: " + arch);
            throw new Error("CROSS_COMPILE is set to true but the current architecture is not supported / implemented for cross compilation.");
        }
    }

    Logger.debug("Environment variables are valid");

    Logger.setPrefix(process.env.NODE_NAME!, 'MAGENTA')
    Logger.setLogLevel(process.env.LOG_LEVEL as 'DEBUG' | 'INFO' | 'WARN' | 'ERROR');

    // Contact the controller to register this node
    Logger.debug("Registering node with controller...");
    const registrationBody:nodeRegistrationRequest = {
        node_name: env.data.NODE_NAME,
        node_psk: env.data.AUTH_TOKEN,
        node_address: env.data.INTERFACE,
        node_port: parseInt(env.data.PORT),
        node_version: 'unknown', // This should be set to the version of the scheduler
        node_arch: arch,
        node_os: process.platform,
        node_max_jobs: parseInt(env.data.MAX_BUILDS)
    }
    const controllerResponse:nodeRegistrationResponse = await fetch(`${env.data.CONTROLLER_URL}/api/v1/node/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `${env.data.CONTROLLER_REGISTRATION_KEY}`
        },
        body: JSON.stringify(registrationBody)
    }).then((res)=>{
        if (!res.ok) {
            Logger.error(`Failed to register node with controller: ${res.status} ${res.statusText}`);
            throw new Error(`Failed to register node with controller: ${res.status} ${res.statusText}`);
        }
        return res.json() as Promise<nodeRegistrationResponse>;
    })
    .catch((err)=>{
        Logger.error(`Failed to register node with controller: ${err}`);
        throw err;
    });
    Logger.info(`Node registered with controller. ID of this node: ${controllerResponse.node_id}`);
    Logger.debug(`Node registration response: ${JSON.stringify(controllerResponse)}`);

    // Insert ourselves into redis
    Logger.debug("Inserting node into Redis...");
    const editor = createClient({
        url: `redis://${env.data.REDIS_USER}:${env.data.REDIS_PASSWORD}@${env.data.REDIS_HOST}:${env.data.REDIS_PORT}/0`
    });
    editor.on('error', (err:Error)=>{
        Logger.error(`Redis editor error: ${err.message}`);
    });
    await editor.connect();
    if(!editor.isOpen){
        Logger.error('Failed to connect to Redis editor');
        throw new Error('Failed to connect to Redis editor');
    }
    Logger.debug('Connected to Redis editor');
    // Insert the node into Redis
    await editor.json.set(`node:${controllerResponse.node_id}:info`, "$", registrationBody).catch((err:Error)=>{
        Logger.error(`Failed to insert node into Redis: ${err.message}`);
        throw new Error(`Failed to insert node into Redis: ${err.message}`);
    });

    // Setup all the necessary storage items for this node (e.g current builds. queued builds etc)
    await editor.json.set(`node:${controllerResponse.node_id}:current_builds`, "$", []).catch((err:Error)=>{
        Logger.error(`Failed to setup current builds in Redis: ${err.message}`);
        throw new Error(`Failed to setup current builds in Redis: ${err.message}`);
    })
    await editor.json.set(`node:${controllerResponse.node_id}:queued_builds`, "$", []).catch((err:Error)=>{
        Logger.error(`Failed to setup queued builds in Redis: ${err.message}`);
        throw new Error(`Failed to setup queued builds in Redis: ${err.message}`);
    })

    await editor.quit().catch((err:Error)=>{
        Logger.error(`Failed to close Redis editor connection: ${err.message}`);
        throw new Error(`Failed to close Redis editor connection: ${err.message}`);
    })
    Logger.debug("Node inserted into Redis");

    // All done, return the environment variables and the node_id
    return {
        env: env.data,
        node_id: controllerResponse.node_id,
        node_psk: registrationBody.node_psk,
        node_data:registrationBody,
        arch: registrationBody.node_arch as arch
    }
}
