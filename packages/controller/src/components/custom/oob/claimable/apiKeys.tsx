import type {keys, xTheEverythingType} from "@/types/db";
import type {ColumnDef} from "@tanstack/react-table";
import { DataTable } from "../../DataTable";

type Payment = {
    id: string
    amount: number
    status: "pending" | "processing" | "success" | "failed"
    email: string
}

export const payments: Payment[] = [
    {
        id: "728ed52f",
        amount: 100,
        status: "pending",
        email: "m@example.com",
    },
    {
        id: "489e1d42",
        amount: 125,
        status: "processing",
        email: "example@gmail.com",
    }
]
export const columns: ColumnDef<keys>[] = [
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
        accessorKey: "created_at",
        header: "Created At",
    }
]

export default function ApiKeys({cache}:{cache:xTheEverythingType}){
    return(
        <div>
            <DataTable columns={columns} data={cache.api_keys ?? []} />
        </div>
    )
}