/*
* This file includes all types related to Redis messaging between the controller and nodes.
* */
import type {healthCheckResponse, nodeRegistrationRequest, websocketMessage} from "../scheduler/index";
import type {database} from '../core/index'
export type arch = 'x86_64-linux' | 'aarch64-linux' | 'armv7l' | 'i686' | 'riscv64' | 'aarch64-darwin' | 'x86_64-darwin';

export type BuildChannelMessage = {
    /*
    * queue: The message is related to the build queue, e.g. a new build is added or a build is cancelled.
    * build: The message is related to a specific build, e.g. a build update or a build result. (This is one way and only ever sent to the controller from a node not the otherway around)
    * claim: The message is related to a build claim, e.g. a node claiming a build or the controller responding to a claim.
    * */
    type: 'queue' | 'build' | 'claim'
    sender: 'controller' | string, // The sender of the message, either 'controller' or the node id
    target: 'controller' | string | null, // The target node of this message, null if it is a broadcast message (e.g. new build)
    data: BuildQueueMessage | BuildUpdateMessage | BuildClaimMessage | BuildClaimResponse
}

type BuildClaimMessage = {
    type: 'claim', // The type of the message
    builder_id: string // The ID of the build
    job_id: string // The ID of the build
}

type BuildClaimResponse = {
    type: 'claim_response', // The type of the message
    builder_id: string, // The ID of the build
    job_id: string, // The ID of the build
    result: 'approved' | 'rejected', // The result of the claim, either 'approved' or 'rejected'. Sent by the controller to the node to confirm that they got the build
}

type BuildQueueMessage = {
    type: 'add' | 'cancel',
    job_id: string, // ID of the build
    builder_id: string // The ID of the config that is being built
    target: string | null, // The target node of this message, null if it is a broadcast message (e.g. new build)
    arch: arch
}
type BuildUpdateMessage = {
    build_id: string, // The ID of the build
    data: database.builder_runs // The data of the message, has to be in the complete format of a builder_runs object so inserting into the db is easier
}

export type NodeChannelMessage = {
    /*
    * Deregister: The node is either deregistering itself or the controller is requesting the node to deregister.
    * This is used when either the healthcheck fails or the node is shutting down
    * Health Check: The node is sending a health check message to the controller to indicate that it is still alive and functioning.
    * */
    type: 'deregister' | 'health_check'
    target: 'controller' | string // The target node of this message
    sender: 'controller' | string // The sender of the message, either 'controller' or the node id
    data:
        healthCheckResponse
        |
        {
        message: 'deregistered' | 'deregistered_failed'
        }
        |
        {} // The data of the message, either a health check response or an empty object
}

export type BuildQueueEntry = {
    published_at: number, // The timestamp when the update was added to the queue
    job: BuildChannelMessage // The update that was added to the queue
}