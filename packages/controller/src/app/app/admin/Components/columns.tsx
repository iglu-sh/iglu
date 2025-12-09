import type {ColumnDef} from "@tanstack/react-table";
import type {builder, cache, keys, public_signing_keys, User, xTheEverythingType} from "@iglu-sh/types/core/db";
import {Button} from "@/components/ui/button";
import type {signing_key_cache_api_link} from "@/types/db";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import {CacheDetails} from "@/app/app/admin/Components/cachesTab";
import DeleteUser from "@/components/custom/user/delete";
import {useSession} from "next-auth/react";
import EditUser from "@/components/custom/user/edit";

export const cachesColumns:ColumnDef<xTheEverythingType>[] = [
    {
        accessorKey: "cache.name",
        header: "Cache Name",
    },
    {
        accessorKey: "cache.api_keys",
        header: "API Keys",
        cell: ({row}) => (row.original.api_keys ?? []).length
    },
    {
        accessorKey: "cache.builders",
        header: "Builders",
        cell: ({row}) => (row.original.builders ?? []).length
    },
    {
        accessorKey: "cache.id",
        header: "Actions",
        cell: ({row}) => {
            return(
                <div className="flex flex-row gap-2">
                    <CacheDetails cacheID={row.original.cache.id} row={row.original} />
                    <Button variant="secondary">
                        Edit Cache
                    </Button>
                    <Button variant="destructive">
                        Delete Cache
                    </Button>
                </div>
            )
        }
    }
]

export const userColumns:ColumnDef<Array<{
    user: User;
    caches: cache[];
    apikeys: keys[];
    signingkeys: Array<{
        public_signing_key: public_signing_keys[];
        signing_key_cache_api_link: signing_key_cache_api_link[]
    }>
}>> = [
    {
        accessorKey: "user.username",
        header: "User Name",
    },
    {
        accessorKey: "caches",
        header: "Assigned Caches",
        cell: ({row}) => (row.original.caches ?? []).length
    },
    {
        accessorKey: "apikeys",
        header: "API Keys",
        cell: ({row}:{row:any}) => (row.original.apikeys ?? []).length
    },
    {
        accessorKey: "user.is_admin",
        header: "Admin Privileges",
        cell: ({row}:{row:any}) => row.original.user.is_admin ? "Yes" : "No"
    },
    {
        accessorKey: "user.id",
        header: "Actions",
        cell: ({row}:{row:any}) => {
            const session = useSession()
            return(
                <div className="flex flex-row gap-2">
                    <EditUser userData={row.original} />
                    {
                        session.data?.user?.id === row.original.user.id ? (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="destructive" disabled>
                                        Delete User
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    Don't delete yourself :(
                                </TooltipContent>
                            </Tooltip>
                        ): <DeleteUser userID={row.original.user.id} />
                    }
                </div>
            )
        }
    }
]

export const buildersColumns:ColumnDef<builder>[] = [
    {
        accessorKey: "name",
        header: "Name",
    },
    {
        accessorKey: "arch",
        header: "Architecture",
    },
    {
        accessorKey: "trigger",
        header: "Trigger",
    },
    {
        accessorKey: "id",
        header: "Actions",
        cell: ({row}) => {
            return(
                <div className="flex flex-row gap-2">
                    <Button>Details</Button>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="secondary">Edit</Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            Coming soon™️!
                        </TooltipContent>
                    </Tooltip>
                    <Button variant="destructive">Delete</Button>
                </div>
            )
        }
    }
]
export const configColumns:ColumnDef<{
    envVar: string,
    value: unknown,
    description: string
}>[] = [
    {
        accessorKey: "envVar",
        header: "Environment Variable",
    },
    {
        accessorKey: "value",
        header: "Value",
        cell: ({row}) => String(row.original.value ?? "Not set")
    },
    {
        accessorKey: "description",
        header: "Description",
        cell: ({row}) => {
            return(
                <Tooltip>
                    <TooltipTrigger>
                        {row.original.description.slice(0, 30) + (row.original.description.length > 30 ? "..." : "")}
                    </TooltipTrigger>
                    <TooltipContent>
                        {row.original.description}
                    </TooltipContent>
                </Tooltip>
            )
        }
    }
]