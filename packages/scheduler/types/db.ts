export type builderDatabase = {
    builder: {
        id: number,
        name: string,
        description: string,
        enabled: boolean,
        trigger: "manual" | "cron" | "webhook",
        cron: string | null,
        webhookurl: string,
    },
    git: {
        repository: string,
        branch: string,
        gitusername: string,
        gitkey: string,
        requiresauth: boolean,
        noclone: boolean,
    },
    buildoptions: {
        cores: number,
        maxjobs: number,
        keep_going: boolean,
        extraargs: string,
        substituters: string,
        trustedpublickeys: string,
        parallelbuilds: boolean, // If this is set to false, any running build that is not finished will be cancelled when a new build is started
        command: string,
    },
    cachix: {
        push: boolean,
        target: string,
        apikey: {
            key: string,
            id: number
        },
        signingkey: {
            id: number,
            privateKey: string,
            publicKey: string,
        },
        builder_id: number,
        buildoutputdir: string,
        id: number
    },
    cache: {
        id: number,
        githubusername: string,
        ispublic: boolean,
        name: string,
        permission: string,
        preferredcompressionmethod: string,
        uri: string,
        priority: number
    }
}

export type builderRunLite = {
    id: number,
    builderId: number,
    status: "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELLED",
    started_at: Date,
    finished_at: Date,
    gitCommit: string,
    duration: number, // in seconds
}

export interface builderRun extends builderRunLite {
    log: string
}
export interface dbBuilder extends builderDatabase {
    lastrun: builderRun | null;
}

export interface builderFrontendPackage extends builderDatabase{
    runs: builderRun[];
}
