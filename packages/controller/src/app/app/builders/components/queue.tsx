import {api} from "@/trpc/react";
import {queueColumns} from "@/app/app/builders/components/columns";
import {DataTable} from "@/components/custom/DataTable";

export default function Queue({cacheID}: {cacheID: number}) {
    // Get the current queue
    const queue = api.builder.getQueue.useQuery({id: cacheID}, {
            refetchInterval: 5000,
        });

    // Re-fetch the queue every 5 seconds
    return <div>
        <div className="text-xs text-muted-foreground mb-2">
            (Auto-refreshes every 5 seconds)
        </div>
        <DataTable columns={queueColumns} data={queue.data ?? []} />
        <div className="text-xs text-muted-foreground mt-2">
            These are the status types:
            <ul>
                <li>
                    <code>created</code> : This job has been created, but no node has claimed it yet.
                </li>
                <li>
                    <code>claimed</code> : This job is queued and claimed by a node, it will be executed as soon as the node has a slot available.
                </li>
                <li>
                    <code>running</code> : This job is running on a node
                </li>
                <li>
                    <code>finished</code> : This job is finished
                </li>
                <li>
                    <code>failed</code> : This job has failed to build
                </li>
                <li>
                    <code>canceled</code> : This job was manually canceled by a user or webhook
                </li>
            </ul>
        </div>
    </div>
}