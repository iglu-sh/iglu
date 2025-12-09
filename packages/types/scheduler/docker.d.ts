export type Type = 'builder' | 'config' | 'container' | 'daemon' | 'image' | 'network' | 'node' | 'plugin' | 'secret' | 'service' | 'volume'
export type Scope = 'local' | 'swarm'
export type DockerEvent = {
    Type: Type,
    Action: string,
    Actor: {

    },
    scope: Scope,
    time: number,
    timeNano: number
}