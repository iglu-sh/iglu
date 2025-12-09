import {api} from "@/trpc/react";
import {DataTable} from "@/components/custom/DataTable";
import {nodeColumns} from "@/app/app/builders/components/columns"
export default function Nodes(){
    // Get the nodes from tRPC
    const nodes = api.builder.getRegisteredNodes.useQuery()
    return(
        <div>
            {
                nodes.data ?
                    <DataTable columns={nodeColumns} data={nodes.data} /> : "Loading..."
            }
        </div>
    )
}