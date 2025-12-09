import type {ColumnDef} from "@tanstack/react-table";
import {type builder, type combinedBuilder, type dbQueueEntry} from "@iglu-sh/types/core/db";
import {Button} from "@/components/ui/button";
import Link from "next/link";
import {useSearchParams} from "next/navigation";
import {toast} from "sonner";
import type {NodeInfo, queueEntry} from "@iglu-sh/types/scheduler";
import CancelRun from "@/app/app/builders/components/cancel-run";
import DeleteBuilder from "@/app/app/builders/details/[builderID]/components/deleteBuilder";

export const columns:ColumnDef<builder>[] = [
    {
        accessorKey: "name",
        header: "Name",
    },
    {
        accessorKey: "arch",
        header: "Arch",
    },
    {
        accessorKey: "description",
        header: "Description",
    },
    {
        accessorKey: "id",
        header: "Actions",
        cell: ({row}) => {
            const searchParams = useSearchParams()
            const cacheID = searchParams.get('cacheID')
            async function triggerBuild(){
                toast.info(`Triggering build for builder ${row.original.name}`)
                await fetch(row.original.webhookurl, {
                    method: 'GET',
                })
                    .then(async (res)=>{
                        let response = await res.text().then((text)=>{
                            try{
                                return JSON.parse(text)
                            }
                            catch{
                                return text
                            }
                        })
                        if(!res.ok){
                            toast.error(`Failed to trigger build: ${res.statusText}, Response: ${response.error ?? "No additional info"}`)
                            return
                        }
                        toast.success(`Build triggered successfully, refer to the queue for more info`)
                    })
                    .catch((err)=>{
                        toast.error(`Failed to trigger build: ${err.message}`)
                    })
            }
            return <div className="flex flex-row gap-2">
                <Button variant="default" id={`trigger-btn-${row.original.id}`}
                    onClick={()=>{triggerBuild()}}
                >Trigger Build</Button>
                <Link href={`/app/builders/details/${row.original.id}?cacheID=${cacheID}`}><Button variant="secondary" id={`edit-btn-${row.original.id}`}>Details</Button></Link>
                <DeleteBuilder builderID={row.original.id} />
            </div>
        }
    }
]


export const queueColumns:ColumnDef<dbQueueEntry>[] = [
    {
        accessorKey: "builder_run.run.id",
        header: "ID",
    },
    {
        accessorKey: "builder_run.run.status",
        header: "Status"
    },
    {
        accessorKey: "builder.run.name",
        header: "Builder Name",
        cell: ({row}) =>{
            return(
                <Link href={`/app/builders/details/${row.original.builder.id}?cacheID=${row.original.builder.cache_id}`}>
                    {row.original.builder.name}
                </Link>
            )
        }
    },
    {
        accessorKey: "builder_run.node_info.node_name",
        header: "Running on"
    },
    {
        accessorKey: "builder_run.run.started_at",
        header: "Duration",
        cell: ({row}) => {
            // Calculate the duration and switch units if needed

            function diff(startInput:string, endInput:string) {
                let start = startInput.split(":");
                let end = endInput.split(":");
                var startDate = new Date(0, 0, 0, parseInt(start[0]!), parseInt(start[1]!), 0);
                var endDate = new Date(0, 0, 0, parseInt(end[0]!), parseInt(end[1]!), 0);
                var diff = endDate.getTime() - startDate.getTime();
                var hours = Math.floor(diff / 1000 / 60 / 60);
                diff -= hours * 1000 * 60 * 60;
                var minutes = Math.floor(diff / 1000 / 60);

                // If using time pickers with 24 hours format, add the below line get exact hours
                if (hours < 0)
                    hours = hours + 24;

                return (hours <= 9 ? "0" : "") + hours + ":" + (minutes <= 9 ? "0" : "") + minutes;
            }


            return(
                <div>
                    {diff(new Date(row.original.builder_run.run.started_at ?? Date.now()).toTimeString().slice(0,5), new Date(row.original.builder_run.run.updated_at).toTimeString().slice(0,5))} <div className={"text-muted-foreground text-xs"}>(HH:MM)</div>
                </div>
            )
        }
    },
    {
        accessorKey: "builder.id",
        header: "Actions",
        cell: ({row}) => {
            // TODO: Implement Cancel Run Button
            console.log(row.original)
            return(
                <div className="flex flex-row gap-2">
                    <CancelRun run={row.original} />
                    <Link href={`/app/builders/runs/${row.original.builder_run.run.id}/details`}>
                        <Button variant="default">View Run</Button>
                    </Link>
                    <Link href={`/app/builders/runs/${row.original.builder_run.run.id}/logs`}>
                        <Button variant="secondary">See Logs</Button>
                    </Link>
                </div>
            )
        }
    }
    ]

export const nodeColumns:ColumnDef<NodeInfo>[] = [
    {
        accessorKey: "node_name",
        header: "Name"
    },
    {
        accessorKey: "node_version",
        header: "Version"
    },
    {
        accessorKey: "node_arch",
        header: "Architecture"
    },
    {
        accessorKey: "node_os",
        header: "Node OS"
    },
    {
        accessorKey: "id",
        header: "Actions",
        cell: ({row}) =>{
            //TODO: Implement Deregister Node Button
            return (
                <div className="flex flex-row gap-2">
                    <Link href={`/app/nodes/${row.original.id}/details`}>
                        <Button variant="secondary">Details</Button>
                    </Link>
                    <Button variant="destructive">Deregister</Button>
                </div>
            )
        }
    }
]