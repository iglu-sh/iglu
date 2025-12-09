import type {ColumnDef} from "@tanstack/react-table";
import type {dbQueueEntry} from "@iglu-sh/types/core/db";
import Link from "next/link";
import {Button} from "@/components/ui/button";

export const columns:ColumnDef<dbQueueEntry>[] = [
    {
        accessorKey: "builder_run.run.id",
        header: "ID",
    },
    {
        accessorKey: "builder_run.run.status",
        header: "Status",
    },
    {
        accessorKey: "builder_run.run.duration",
        header: "Duration",
    },
    {
        accessorKey: "builder_run.run.started_at",
        header: "Started",
    },
    {
        accessorKey: "builder_run.run.gitcommit",
        header: "Git Commit",
    },
    {
        accessorKey: "builder_run.node_info.node_name",
        header: "Ran on",
    },
    {
        accessorKey: "builder_run.run.log",
        header: "Actions",
        cell: ({row}) => {
            return (
                <div>
                    <Link href={`/app/builders/runs/${row.original.builder_run.run.id}/details?cacheID=${row.original.builder.cache_id}`}>
                        <Button>
                            View Details
                        </Button>
                    </Link>
                </div>
            )
        }
    },
]
