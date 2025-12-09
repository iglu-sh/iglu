/*
* This file exposes logic to build a nix config using the scheduler.
* It includes functions to:
* - Initialize a Builder instance
* - Listen to messages from the Builder and publish those to the redis instance
* */

import Docker from "dockerode";

export function initializeBuilder(
    docker: Docker
){

}