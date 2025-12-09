import type {xTheEverythingType} from "@iglu-sh/types/core/db";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {DataTable} from "@/components/custom/DataTable";
import {cachesColumns} from "@/app/app/admin/Components/columns";
import {
    Dialog, DialogClose,
    DialogContent,
    DialogDescription, DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {api} from "@/trpc/react";
import {LoaderCircle} from "lucide-react";
import {Label} from "@/components/ui/label";
import {Badge} from "@/components/ui/badge";

export default function CachesTab({everything}:{everything:xTheEverythingType[]}){
    return(
        <Card className="flex flex-col gap-4">
            <CardHeader>
                <CardTitle className="text-xl font-bold">
                    Caches
                </CardTitle>
                <CardDescription>
                    Manage your caches here. Total caches: {everything.length}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <DataTable columns={cachesColumns} data={everything} />
            </CardContent>
        </Card>
    )
}

export function CacheDetails({cacheID, row}:{cacheID:number, row:xTheEverythingType}){
    const cache = api.cache.getOverview.useQuery({cacheID: cacheID})
    console.log(row.builders)
    let totalBuilderRuns = 0;
    let buildersInThisCache = 0
    row.builders?.forEach((builder) => {
        if(builder.builder.cache_id == cacheID){
            buildersInThisCache += 1;
            totalBuilderRuns += builder.runs.length ?? 0;
        }
    });
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button>View Details</Button>
            </DialogTrigger>
            <DialogContent>
                {
                    cache.data ? (
                        <div>
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold">Details for cache {cacheID}</DialogTitle>
                                <DialogDescription>
                                    Detailed information for cache {cache.data.info.name}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid grid-cols-2 mt-4 gap-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>
                                            General Information
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex flex-col gap-2">
                                        <div className="flex flex-row justify-between items-center">
                                            <Label>ID</Label>
                                            <Badge>{cache.data.info.id}</Badge>
                                        </div>
                                        <div className="flex flex-row justify-between items-center">
                                            <Label>Name</Label>
                                            <Badge>{cache.data.info.name}</Badge>
                                        </div>
                                        <div className="flex flex-row justify-between items-center">
                                            <Label>Cache public?</Label>
                                            <Badge>{cache.data.info.ispublic ? 'True' : 'False'}</Badge>
                                        </div>
                                        <div className="flex flex-row justify-between items-center">
                                            <Label>Uri</Label>
                                            <Badge>{cache.data.info.uri}</Badge>
                                        </div>
                                        <div className="flex flex-row justify-between items-center">
                                            <Label>Compression Method</Label>
                                            <Badge>{cache.data.info.preferredcompressionmethod}</Badge>
                                        </div>
                                        <div className="flex flex-row justify-between items-center">
                                            <Label>Priority</Label>
                                            <Badge>{cache.data.info.priority}</Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader>
                                        <CardTitle>
                                            Package Information
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex flex-col gap-2">
                                        <div className="flex flex-row justify-between items-center">
                                            <Label>
                                                Total Packages
                                            </Label>
                                            <Badge>
                                                {cache.data.packages.total}
                                            </Badge>
                                        </div>
                                        <div className="flex flex-row justify-between items-center">
                                            <Label>
                                                Storage Used
                                            </Label>
                                            <Badge>
                                                {cache.data.packages.storage_used} GB
                                            </Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader>
                                        <CardTitle>
                                            Builder Overview
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex flex-col gap-2">
                                        <div className="flex flex-row justify-between items-center">
                                            <Label>
                                                Total Builders
                                            </Label>
                                            <Badge>
                                                {buildersInThisCache}
                                            </Badge>
                                        </div>
                                        <div className="flex flex-row justify-between items-center">
                                            <Label>
                                                Total Builder Runs (in this cache)
                                            </Label>
                                            <Badge>
                                                {totalBuilderRuns}
                                            </Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader>
                                        <CardTitle>
                                            API Key Overview
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex flex-col gap-2">
                                        <div className="flex flex-row justify-between items-center">
                                            <Label>
                                                Total API Keys
                                            </Label>
                                            <Badge>
                                                {row.api_keys?.length ?? 0}
                                            </Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader>
                                        <CardTitle>
                                            Public Signing Key Overview
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex flex-col gap-2">
                                        <div className="flex flex-row justify-between items-center">
                                            <Label>
                                                Total Public Signing Keys
                                            </Label>
                                            <Badge>
                                                {row.public_signing_keys?.length ?? 0}
                                            </Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    ): <div className="w-full flex flex-row justify-center items-center p-10">
                        <LoaderCircle className="animate-spin" />
                    </div>
                }
                <DialogFooter className="w-full">
                    <DialogClose asChild className="w-full">
                        <Button>Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}