"use client";
import { Database, Dot, Hammer, Key, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/trpc/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import EditUser from "@/components/custom/user/edit";
import { SessionProvider, useSession } from "next-auth/react";
import { DataTable } from "@/components/custom/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { cache } from "@/types/db";
import type { cache_user_link } from "@iglu-sh/types";

export default function UserPageSessionWrapper() {
    return (
        <SessionProvider>
            <UserPage />
        </SessionProvider>
    );
}
export function UserPage() {
    const session = useSession();
    const sessionData = session.data ? session.data.user.user : null;
    const caches_api = api.cache.byUser.useQuery();
    const caches = caches_api.data;
    const keys_api = api.user.getApiKeys.useQuery();
    const keys = keys_api.data;
    const { data } = api.user.getUserWithKeysAndCaches.useQuery();

    const cacheColumns: ColumnDef<cache_user_link> = [
        {
            accessorKey: "cache.name",
            header: "Cache Name",
        },
        {
            accessorKey: "cache.uri",
            header: "URI",
        },
        {
            accessorKey: "cache.ispublic",
            header: "Public",
        },
        {
            accessorKey: "cache.id",
            header: "Action",
            cell: ({ row }) => {
                return (
                    <>
                        <Button
                            onClick={() =>
                                redirect(
                                    "/app/settings?cacheID=" + row.original.id,
                                )
                            }
                        >
                            Edit
                        </Button>
                    </>
                );
            },
        },
    ];

    return (
        <div className="flex w-full flex-col gap-4">
            <div className="flex w-full flex-row items-center justify-between">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-bold">Profile</h1>
                    <p className="text-muted-foreground mt-2 text-sm">
                        Your profile information
                    </p>
                </div>
                <div className="flex flex-row gap-2">
                    {data?.[0] ? (
                        <EditUser
                            text="Edit"
                            variant="default"
                            userData={data[0]}
                        />
                    ) : (
                        <Button disabled={true}>Edit</Button>
                    )}
                </div>
            </div>
            <div className="grid grid-cols-1 gap-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex flex-row items-center gap-2 text-2xl font-bold">
                            <User />
                            Account
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-[min-content_1fr] gap-10">
                        <Avatar className="h-30 w-30">
                            <AvatarFallback
                                style={{
                                    backgroundColor: session.data
                                        ? session.data.user.user.avatar_color
                                        : "#000000",
                                    fontSize: "5rem",
                                }}
                            >
                                {session.data
                                    ? session.data.user.user.username.charAt(0)
                                    : "U"}
                            </AvatarFallback>
                            {session.data ? (
                                <AvatarImage
                                    src={session.data.user.user.avatar}
                                />
                            ) : null}
                        </Avatar>
                        <div className="flex items-center">
                            <div>
                                <div className="text-xl font-bold">
                                    {sessionData?.username ?? "inuit"}
                                </div>
                                <br />
                                <div className="flex w-full flex-row">
                                    {sessionData?.email ?? "inuit@iglu.sh"}
                                    <Dot />
                                    <Badge
                                        variant={
                                            sessionData?.is_admin
                                                ? "default"
                                                : "secondary"
                                        }
                                    >
                                        {sessionData?.is_admin
                                            ? "Admin"
                                            : "Inuit"}
                                    </Badge>
                                    <Dot />
                                    Ownes {caches?.length ?? "0"}{" "}
                                    {caches?.length != 1 ? "Caches" : "Cache"}
                                    <Dot />
                                    Ownes {keys?.length ?? "0"}{" "}
                                    {keys?.length != 1 ? "Keys" : "Key"}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex flex-row items-center gap-2 text-2xl font-bold">
                            <Database />
                            Caches
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {caches ? (
                            <DataTable columns={cacheColumns} data={caches} />
                        ) : null}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
