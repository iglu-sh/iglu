import Docker from 'dockerode';
import type {runningBuilder} from "@/types/scheduler";
import Logger from "@iglu-sh/logger";
import Database from "@/lib/db";

/*
* This function closes stops the given Docker container and inserts the end state into the database.
* */
export default async function end(runningBuilder:runningBuilder | undefined, reason: 'FAILED' | 'SUCCESS', DOCKER:Docker, DB:Database, DOCKER_ID:string, RUN_ID:number, removeRunningBuilder: (dockerID:string)=>void): Promise<void> {
    try {
        // Stop the Docker container
        const container = DOCKER.getContainer(DOCKER_ID);
        await container.kill();
        await container.remove();

        // Update the database with the end state (i.e transitioning the builder to either the FAILED or SUCCESS state)
        const LOG = runningBuilder ? runningBuilder.output : 'No Logs available';

        await DB.updateBuilderRun(RUN_ID, reason, LOG)

        // Remove the builder from the running builders array
        removeRunningBuilder(DOCKER_ID);

        // Log the end of the builder
        Logger.debug(`Builder ${DOCKER_ID} ended with reason: ${reason}`);
    } catch (error) {
        Logger.error(`Error ending builder ${DOCKER_ID}: ${error}`);
        throw error;
    }
}