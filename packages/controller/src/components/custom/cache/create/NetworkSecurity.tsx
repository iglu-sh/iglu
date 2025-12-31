import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Network } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";
import type {
    cache_api_key_link,
    cache_user_link,
    cacheCreationObject,
} from "@iglu-sh/types";
import { useEffect } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/custom/DataTable";
import { columns } from "@/components/custom/oob/claimable/apiKeys";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import SearchUserDialogue from "@/components/custom/cache/create/searchUserDialogue";

export default function NetworkSecurity({
    cacheToCreate,
    setCacheToCreate,
    setInvalid,
}: {
    cacheToCreate: cacheCreationObject;
    setCacheToCreate: (cache: cacheCreationObject) => void;
    setInvalid: (data: boolean) => void;
}) {
    const availableApiKeys = api.user.getApiKeys.useQuery();
    const allUsers = api.user.getAll.useQuery();
    const columns: ColumnDef<cache_api_key_link>[] = [
        {
            accessorKey: "key.name",
            header: "API Key",
        },
        {
            accessorKey: "caches",
            header: "Associated Caches",
            cell: ({ row }) => {
                return (
                    <span className="text-muted-foreground text-sm">
                        {"None"}
                    </span>
                );
            },
        },
        {
            accessorKey: "key.id",
            header: "Actions",
            cell: ({ row }) => {
                return (
                    <Checkbox
                        onCheckedChange={() => {
                            // Toggle the selection of the API key
                            const selectedApiKeys = [
                                ...cacheToCreate.selectedApiKeys,
                            ];
                            if (
                                selectedApiKeys.filter(
                                    (k) => k.id === row.original.key.id,
                                ).length > 0
                            ) {
                                // Remove the key if it's already selected
                                setCacheToCreate({
                                    ...cacheToCreate,
                                    selectedApiKeys: selectedApiKeys.filter(
                                        (k) => k.id !== row.original.key.id,
                                    ),
                                });
                            } else {
                                // Add the key if it's not selected
                                setCacheToCreate({
                                    ...cacheToCreate,
                                    selectedApiKeys: [
                                        ...selectedApiKeys,
                                        row.original.key,
                                    ],
                                });
                            }
                        }}
                        checked={
                            cacheToCreate.selectedApiKeys.filter(
                                (k) => k.id === row.original.key.id,
                            ).length > 0
                        }
                        disabled={false}
                    ></Checkbox>
                );
            },
        },
    ];
    const users: ColumnDef<User>[] = [
        {
            accessorKey: "username",
            header: "User Name",
        },
        {
            accessorKey: "email",
            header: "Email",
        },
        {
            accessorKey: "id",
            header: "Actions",
            cell: ({ row }) => {
                return (
                    <Button
                        variant="destructive"
                        onClick={() => {
                            const selectedUsers = [
                                ...cacheToCreate.allowedUsers,
                            ];
                            // Remove the user from the allowed users
                            setCacheToCreate({
                                ...cacheToCreate,
                                allowedUsers: selectedUsers.filter(
                                    (u) => u.id !== row.original.id,
                                ),
                            });
                        }}
                    >
                        Remove
                    </Button>
                );
            },
        },
    ];
    useEffect(() => {
        setInvalid(false);
    }, [cacheToCreate]);
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex flex-row items-center gap-2">
                    <Network />
                    <h2 className="flex flex-row items-center gap-2 text-2xl font-bold">
                        Network & Security
                    </h2>
                </CardTitle>
                <CardDescription>SSL and access controls</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                    <label>URL</label>
                    <div className="text-muted-foreground bg-muted overflow-scroll rounded p-1 font-mono text-sm">
                        {`${process.env.NEXT_PUBLIC_CACHE_URL}/${cacheToCreate.cache.name}`}
                    </div>
                </div>
                <div className="col-span-2 flex flex-row justify-between">
                    <div className="flex flex-col">
                        <strong>Enable SSL/TLS</strong>
                        <div className="text-muted-foreground text-sm">
                            Secure connections with HTTPS
                        </div>
                    </div>
                    <Switch disabled />
                </div>
                <div className="col-span-2 flex flex-col gap-2">
                    <strong>Allowed API Keys</strong>
                    <div className="text-muted-foreground text-sm">
                        Select which API keys can access this cache. If none are
                        selected, you will not be able to push to this cache
                        until you create or add one.
                    </div>
                    <DataTable
                        columns={columns}
                        data={availableApiKeys.data ?? []}
                    />
                </div>
                <div className="col-span-2 flex flex-col gap-2">
                    <strong>Allowed Users</strong>
                    <div className="text-muted-foreground text-sm">
                        Select which users can administer this cache. If none
                        are selected, you are the only user who can administer
                        this cache.
                    </div>
                    <DataTable
                        columns={users}
                        data={cacheToCreate.allowed_users}
                    />
                    {allUsers.isLoading && allUsers.data ? (
                        <div className="text-muted-foreground">
                            Loading users...
                        </div>
                    ) : (
                        <SearchUserDialogue
                            setCacheToCreate={(data: cacheCreationObject) =>
                                setCacheToCreate(data)
                            }
                            cacheToCreate={cacheToCreate}
                            availUsers={allUsers.data!}
                        />
                    )}
                </div>
                <div className="col-span-2 flex flex-col gap-2">
                    <strong>Allowed IP Ranges (optional)</strong>
                    <Textarea
                        placeholder="10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, etc."
                        disabled={true}
                    />
                    <div className="text-muted-foreground text-sm">
                        Leave empty to allow all IPs, Use CIDR notation for IP
                        ranges and separate them with commas.
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
