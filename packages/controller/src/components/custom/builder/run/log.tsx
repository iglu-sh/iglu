import {api} from "@/trpc/react";
import {useEffect} from "react";
import type {dbQueueEntry} from "@iglu-sh/types/core/db";
import type {wsMsg} from "@iglu-sh/types/builder/websocket";

export default function Log({buildID, cacheID, dbQueueEntry, setDbQueueEntry}: {buildID: string, cacheID:number, dbQueueEntry:dbQueueEntry, setDbQueueEntry: (entry: dbQueueEntry) => void}) {
    const subscription = api.builder.getLog.useSubscription({"jobID": parseInt(buildID), "cacheID": 1})
    useEffect(()=>{
        console.log('Subscription data', subscription.data, subscription)
        // Set the builder_run.run to the latest data from subscription
        if(subscription.data){
            setDbQueueEntry({
                ...dbQueueEntry,
                builder_run: {
                    ...dbQueueEntry.builder_run,
                    run: subscription.data
                }
            })
        }
    }, [subscription])
    return(
        <div className="flex flex-col">
            <div className="flex flex-row gap-2 p-2 bg-card border font-bold" style={{
                borderTopLeftRadius: "var(--radius-lg)",
                borderTopRightRadius: "var(--radius-lg)",
                borderWidth: "1px"
            }}>
                <div>
                    Build Log
                </div>
                <div className="ml-auto">
                    (latest 100 lines)
                </div>
            </div>
            <div className="flex flex-col gap-1 p-2 bg-card border border-t-0 font-mono h-96 overflow-y-scroll text-xs">
                {
                    subscription.data ?
                    <div>
                        {
                            subscription.data.log.split("\n").map((line, index)=>{
                                console.log(line)
                                let logLine: wsMsg = {
                                    jobStatus: "unknown"
                                };
                                if(line.trim().startsWith("{") && line.trim().endsWith("}")){
                                    logLine = JSON.parse(line.trim()) as wsMsg;
                                }
                                console.log(logLine)
                                if(logLine.jobStatus === "unknown"){
                                    return
                                }

                                if(logLine.stdout){
                                    return <div key={index}>{logLine.stdout ? `[STDOUT] ${logLine.stdout}` : "unknown"} <br /></div>
                                }
                                else if(logLine.msg){
                                    return <div key={index}>{logLine.msg ? `[WS-MSG] ${logLine.msg}` : "unknown"} <br /></div>
                                }
                                return <div key={index}>Unknown log format: {line} <br /></div>
                            })
                        }
                        <br />
                        <span className="text-xs text-muted-foreground">End of Build Output</span>
                    </div> : null
                }
            </div>
        </div>
    )
}