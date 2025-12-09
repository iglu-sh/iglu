'use client'
import {api} from "@/trpc/react";
import {useEffect} from "react";
import {DataTable} from "@/components/custom/DataTable";
import {columns} from "@/app/app/builders/components/columns";
import type {builder as builderType} from "@iglu-sh/types/core/db";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {Terminal} from "lucide-react";
export function BuilderOverview({cacheID}:{cacheID:number}){
    // Fetch all builders for the current user
    const builder = api.builder.getAllBuilders.useQuery({cache: cacheID});
    // Fetch all nodes to show an alert if there are no nodes
    const nodes = api.builder.getRegisteredNodesLite.useQuery(undefined, {refetchInterval: 5000});
    useEffect(() => {
        if(builder.data){
            console.log(builder.data)
        }
        else{
            console.log("No data")
        }
    }, [builder]);
    return (
        <div className="flex flex-col gap-4">
            {
                builder.isLoading || !builder.data ? (<div>Loading...</div>) : (
                    <DataTable columns={columns} data={builder.data as builderType[]} />
                )
            }
            {
                // Show an alert if there are no registered nodes
                nodes.isLoading || !nodes.data ? null : (
                    nodes.data.length === 0 ? <Alert variant="destructive">
                        <Terminal />
                        <AlertTitle>No nodes registered</AlertTitle>
                        <AlertDescription>
                            There are currently no nodes registered that could execute your builds. <br />
                            Please register at least one node to enable building functionality. <br />
                            If you're not the administrator, please contact them to set up a node.
                        </AlertDescription>
                    </Alert> : null
                )
            }
        </div>
    )
}