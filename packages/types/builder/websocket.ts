export type wsMsg = {
    jobStatus: 'failed' | "success" | "starting" | "running"
    error?: string,
    msg?: string,
    stdout?: string,
    childExitCode?: number
    timestamp: Date
}
