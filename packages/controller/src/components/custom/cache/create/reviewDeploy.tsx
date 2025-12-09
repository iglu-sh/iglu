import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import type {apiKeyWithCache, cache, keys, User} from "@/types/db";
import type {ColumnDef} from "@tanstack/react-table";
import {Checkbox} from "@/components/ui/checkbox";
import {DataTable} from "@/components/custom/DataTable";
import type {cacheCreationObject} from "@/types/frontend";
import {api} from "@/trpc/react";
import {toast} from "sonner";
import {
    Dialog, DialogClose,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import {LoaderCircle} from "lucide-react";
import {useState} from "react";
import {isNull} from "is-what";
import Link from "next/link";

export default function ReviewDeploy({cacheToCreate}:{cacheToCreate: cacheCreationObject}) {
    console.log("ReviewDeploy", cacheToCreate);
    const [created, setCreated] = useState<boolean | null>(null);
    const [createdCache, setCreatedCache] = useState<cache | null>(null);
    const createCache = api.cache.createCache.useMutation({
        onSuccess: (data) => {
            toast.success("Cache created successfully!");
            setCreated(true)
            console.log(data)
            setCreatedCache(data)
            console.log("Cache created successfully", data);
        },
        onError: (error) => {
            toast.error("Error creating cache: " + error.message);
            setCreated(false)
        }
    })
    const columns:ColumnDef<keys>[] = [
        {
            accessorKey: "name",
            header: "API Key"
        },
        {
            accessorKey: "description",
            header: "Description"
        },
        {
            accessorKey: "created_at",
            header: "Created At",
        },
        {
            accessorKey: "id",
            header: "ID",
        }
    ]
    const userColumns:ColumnDef<User>[] = [
        {
            accessorKey: "username",
            header: "Username"
        },
        {
            accessorKey: "email",
            header: "Email"
        },
        {
            accessorKey: "id",
            header: "ID",
        }
    ]
    return(
        <Card>
            <CardHeader>
                <CardTitle>Review & Deploy</CardTitle>
                <CardDescription>Review your settings and then deploy</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col">
                            <div>
                                Name: {cacheToCreate.name.length > 0 ? cacheToCreate.name : <span className="text-red-500">Not Set!</span>}
                            </div>
                            <div>
                                Description: N/A
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Security</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1">
                            <h2 className="font-bold">Selected API Keys</h2>
                            <DataTable columns={columns} data={cacheToCreate.selectedApiKeys} />
                            <div className="text-sm text-muted-foreground">If there are none here, you will have to add one later</div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <h2 className="font-bold">Allowed Users</h2>
                            <DataTable columns={userColumns} data={cacheToCreate.allowedUsers} />
                            <div className="text-sm text-muted-foreground">You will be added to your cache, even if there&#39;s no selected user here</div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Storage</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-1">
                            <div>
                                <strong>Preferred Compression Method:</strong> {cacheToCreate.preferredcompressionmethod || "Not Set"}
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Dialog onOpenChange={() => {setCreated(null); setCreatedCache(null)}}>
                    <DialogTrigger asChild>
                        <Button onClick={()=>{
                            createCache.mutate(cacheToCreate)
                        }}>Deploy</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Creating Cache</DialogTitle>
                            <DialogDescription>This will only take a few seconds!</DialogDescription>
                        </DialogHeader>
                        {
                            isNull(created) ?  (
                                <div className="flex items-center justify-center">
                                    <LoaderCircle className="animate-spin" size={24}></LoaderCircle>
                                </div>
                            ) : null
                        }
                        {
                            created === true ? (
                                <div className="flex items-center flex-col justify-center">
                                    <div className="text-green-500">Cache created successfully!</div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Link href={"/app/caches/create"}>
                                            <Button variant="secondary">
                                                Create Another Cache
                                            </Button>
                                        </Link>
                                        <Link href={"/app?cacheID=" + createdCache!.id}>
                                            <Button>
                                                Go to created Cache
                                            </Button>

                                        </Link>
                                    </div>
                                </div>
                            ) : !isNull(created) && !created ? (
                                <div className="flex flex-col items-center justify-center gap-4">
                                    <span className="text-red-500">There was an error during creation. Please go back and check your entries. The most common error is that a cache with that name already exists!</span>
                                    <DialogClose asChild>
                                        <Button>Go back</Button>
                                    </DialogClose>
                                </div>
                            ) : null
                        }
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    )
}