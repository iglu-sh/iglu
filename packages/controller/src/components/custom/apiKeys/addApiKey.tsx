import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {api} from "@/trpc/react";
import type {ColumnDef} from "@tanstack/react-table";
import type {cache_key, keys} from "@/types/db";
import type {cache, public_signing_keys} from "@iglu-sh/types/core/db";
import {DataTable} from "@/components/custom/DataTable";
import {LoaderCircle} from "lucide-react";
import {Checkbox} from "@/components/ui/checkbox";
import {useState} from "react";

export default function AddApiKey({cacheId, alreadyAssignedKeys, alreadyAssignedPSKs, onAddCallback = ()=>{}}:{cacheId:string, alreadyAssignedKeys:Array<number>, alreadyAssignedPSKs:Array<number>, onAddCallback?: ()=>void}){
    const availableApiKeys = api.user.getApiKeys.useQuery()
    console.log(alreadyAssignedPSKs, alreadyAssignedKeys)
    const [selectedKeys, setSelectedKeys] = useState(alreadyAssignedKeys)
    const [selectedPSKs, setSelectedPSKs] = useState(alreadyAssignedPSKs)
    const [psksToShow, setPsksToShow] = useState<public_signing_keys[]>([])
    const apiKeyColumns:ColumnDef<{
        key: keys
        cacheKeyLinks: cache_key[]
        caches: cache[]
        associatedPSKs: public_signing_keys[]
    }>[] = [
        {
            accessorKey: "key.id",
            header: "Select",
            cell: ({row}) => {
                return (
                    <Checkbox defaultChecked={selectedKeys.includes(row.original.key.id)} onCheckedChange={()=>{
                        if(selectedKeys.includes(row.original.key.id)){
                            setSelectedKeys(selectedKeys.filter(id => id !== row.original.key.id))
                            // remove the psks associated with this key from selectedPSKs
                            const pskIdsToRemove = row.original.associatedPSKs.map(psk => psk.id)

                            setPsksToShow(prev => {
                                return prev.filter(psk => !pskIdsToRemove.includes(psk.id))
                            })
                        } else {
                            setSelectedKeys([...selectedKeys, row.original.key.id])
                            // add the psks associated with this key to selectedPSKs
                            setPsksToShow(prev => {
                                const newPSKs = row.original.associatedPSKs.filter(psk => !prev.find(existing => existing.id === psk.id))
                                return [...prev, ...newPSKs]
                            })
                        }
                    }} />
                )
            }
        },
        {
            accessorKey: "key.description",
            header: "Description",
        },
        {
            accessorKey: "associatedPSKs",
            header: "Associated PSKs",
            cell: ({row}) => {
                const pskNames = row.original.associatedPSKs.map(psk => psk.name)
                return pskNames.length
            }
        },
        {
            accessorKey: "caches",
            header: "Associated Caches",
            cell: ({row}) => {
                console.log(row.original)
                return row.original.caches.length
            }
        }
    ]
    const pskColumns:ColumnDef<public_signing_keys>[] = [
        {
            accessorKey: "id",
            header: "Select",
            cell: ({row}) => {
                return (
                    <Checkbox defaultChecked={selectedPSKs.includes(row.original.id)} onCheckedChange={()=>{}} />
                )
            }
        },
        {
            accessorKey: "name",
            header: "Name",
        }
    ]
    return(
        <Dialog>
            <DialogTrigger asChild>
                <Button>
                    Add API Key
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add API Key</DialogTitle>
                    <DialogDescription>
                        Add an API key to the cache with ID: {cacheId} <br />
                        To create a new API key, go to your Userprofile.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4 w-full overflow-x-auto">
                    <div className="flex flex-col gap-2">
                        Your API Keys
                    </div>
                    <div className="max-w-full">
                        {
                            availableApiKeys.data ?
                                <DataTable columns={apiKeyColumns} data={availableApiKeys.data} pageIndex={0} pageSize={25} noPagination={false} />:
                                <LoaderCircle className="animate-spin" />
                        }
                    </div>
                    {
                        psksToShow.length > 0 ? <DataTable columns={pskColumns} data={psksToShow} pageIndex={0} pageSize={25} noPagination={false} /> : null
                    }
                </div>
            </DialogContent>
        </Dialog>
    )
}