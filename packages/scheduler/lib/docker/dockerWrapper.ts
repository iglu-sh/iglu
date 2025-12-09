import Docker from "dockerode";
import Logger from "@iglu-sh/logger";
import os from "os";

export default class DockerWrapper{
    private static DockerClient:Docker;
    constructor(DOCKER:Docker) {
        Logger.info(`Setting Docker Client`)
        DockerWrapper.DockerClient = DOCKER;
    }
    static getClient():Docker{
        return DockerWrapper.DockerClient
    }
    static async setup(){
        Logger.debug(`Setting Docker Client`)
        Logger.debug('Creating Docker Network')
        const info = await DockerWrapper.DockerClient.listNetworks()
        if(info.filter((nw)=>{return nw.Name === "iglu-nw"}).length === 0) {
            Logger.info('Creating Docker network "iglu-nw"');
            await DockerWrapper.DockerClient.createNetwork({
                Name: 'iglu-nw',
                CheckDuplicate: true,
                Driver: 'bridge',
            }).catch((error) => {
                Logger.error(`Failed to create Docker network "iglu-nw": ${error.message}`);
            });
        }
        else{
            Logger.debug('Docker Network exists, not creating')
        }

        if (process.env.DOCKER_MODE === "true"){
          Logger.debug("Running in Container, connection to iglu-nw!")
          const igluNw = DockerWrapper.DockerClient.getNetwork("iglu-nw")
          const schedulerCon = await DockerWrapper.DockerClient.getContainer(os.hostname()).inspect()

          const networks = Object.keys(schedulerCon.NetworkSettings.Networks)

          if(!networks.includes("iglu-nw")){
          Logger.debug("Connecting Scheduler to iglu-nw")
            igluNw.connect({Container: os.hostname()}, (err, data) => {
              if(err){
                Logger.error("Could not connect Scheduler to iglu-nw: " + err)
                process.exit(1)
              }
            })
          }
            Logger.debug("Scheduler is already in iglu-nw")
          }else{
            Logger.debug("Connecting Scheduler to iglu-nw")
            igluNw.connect({Container: os.hostname()}, (err, data) => {
              if(err){
                Logger.error("Could not connect Scheduler to iglu-nw: " + err)
                process.exit(1)
              }
            })
          }
        }
    }
    // Starts a builder with the given id
    static async startBuilder(id:string, builderConfigID:number, jobID:string, release:string, log_level:string){
        // Check if a builder with that name already exists
        const containers = await DockerWrapper.DockerClient.listContainers()
        const duplicateNameContainers = containers.filter((container)=>{
            const containerNameLength = container.Names.filter((name)=>{
                return name.includes(id)
            })
            if(containerNameLength.length > 0){
                return true
            }
            return false
        })
        if(duplicateNameContainers.length > 0){
            throw new Error(`Could not start container with id: ${id}, duplicate name`);
        }
        // We need to differentiate between darwin and everything else, as darwin does not have support for docker routes
        // This means that we need to bind the ports to localhost instead (and generate random ones)
        if(process.platform === 'darwin'){
            //TODO: Generate random port here
            Logger.info(`Starting Docker container for builder config ID ${builderConfigID} (jobID: ${jobID}) on Darwin platform`);
            // Generate a random port for the docker container and check if it's available
            let portAvailable = false
            let port = 0
            while(!portAvailable){
                port = Math.floor(Math.random() * (40000 - 20000 + 1)) + 20000
                Logger.debug(`Checking port ${port} for availability`);
                const usedPorts = containers.flatMap((container)=>{
                    return Object.values(container.Ports).map((p)=>{
                        return p.PublicPort
                    })
                })
                if(usedPorts.includes(port)){
                    Logger.debug(`Port ${port} is already in use by another container, trying another one`);
                    continue
                }
                portAvailable = true
            }
            Logger.debug(`Selected port ${port} for container ${id}`);

            DockerWrapper.DockerClient.run(`${process.env.DOCKER_IMAGE}`, [], [], {Tty: false, name: id, HostConfig:{AutoRemove: true, NetworkMode:'iglu-nw', PortBindings: {"3000/tcp": [{"HostPort":port.toString(), "HostIP": "0.0.0.0"}]}}, Env: [`LOG_LEVEL=${log_level}`]}, async (err)=>{
                if(err){
                    Logger.error(`Error starting Docker container for builder config ID ${builderConfigID} (jobID: ${jobID}): ${err.message}`);
                    throw new Error(`Error starting Docker container for builder config ID ${builderConfigID}: ${err.message}`);
                }
            })
            return
        }

        // If we are here, we are not on darwin
        // In case that cross-compilation is enabled on this node, we need to start the builder privileged
        let shouldSpawnPrivileged = false
        if(process.env.CROSS_COMPILE === 'true'){
            shouldSpawnPrivileged = true
        }
        DockerWrapper.DockerClient.run(`ghcr.io/iglu-sh/iglu-builder:${release}`, [], [], {Tty: false, name: id, HostConfig:{AutoRemove: true, NetworkMode:'iglu-nw', Privileged:shouldSpawnPrivileged}, Env: [`LOG_LEVEL=${log_level}`]},
            async (err)=>{ if(err){
                Logger.error(`Error starting Docker container for builder config ID ${builderConfigID} (jobID: ${jobID}): ${err.message}`);
                throw new Error(`Error starting Docker container for builder config ID ${builderConfigID}: ${err.message}`);
            }
        })
    }
    static async stopBuilder(id:string){
        // Stops a builder with the given id
        const container = DockerWrapper.DockerClient.getContainer(id)
        // Check if the container exists and if it's running
        const containerInfo = await container.inspect().catch((err)=>{
            Logger.error(`Could not inspect container with id: ${id}, error: ${err.message}`);
        })

        if(!containerInfo || !containerInfo.State.Running){
            Logger.debug(`Container with id: ${id} is not running, nothing to stop`);
            return
        }
        await container.stop().catch((err)=>{
            Logger.debug(`Could not stop container with id: ${id}, error: ${err.message}`);
        })
    }
}
