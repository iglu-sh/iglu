import type {public_signing_keys, xTheEverythingType} from "@/types/db";
import type {ColumnDef} from "@tanstack/react-table";
import {DataTable} from "@/components/custom/DataTable";
export const columns: ColumnDef<public_signing_keys>[] = [
    {
        accessorKey: "id",
        header: "ID",
    },
    {
        accessorKey: "name",
        header: "Name",
    },
    {
        accessorKey: "description",
        header: "Description",
        cell: (col) => {
            return (
                <div className="max-w-[300px] truncate">
                    {col.getValue<string>()}
                </div>
            )
        }
    },
    {
        accessorKey: "key",
        header: "Public Key",
        cell: (col) => {
            return (
                <div className="max-w-[300px] truncate">
                    {col.getValue<string>()}
                </div>
            )
        }
    },
    {
        accessorKey: "created_at",
        header: "Created At",
    }
]

export default function PublicKeys({cache}:{cache:xTheEverythingType}){
    return(
        <div className="container mx-auto mt-4">
            <DataTable columns={columns} data={cache.public_signing_keys ? cache.public_signing_keys.map((key)=> key.key) : []} />
        </div>
    )
}