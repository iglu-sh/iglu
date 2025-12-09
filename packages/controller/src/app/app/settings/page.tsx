'use client'
import Link from "next/link";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {AlertCircleIcon, Bot, LoaderCircle} from "lucide-react";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import {Select, SelectContent, SelectItem, SelectTrigger} from "@/components/ui/select";
import type {ColumnDef} from "@tanstack/react-table";
import type {cache, keys, log, public_signing_keys} from "@/types/db";
import {DataTable} from "@/components/custom/DataTable";
import {Button} from "@/components/ui/button";
import {api} from "@/trpc/react";
import {useParams, useSearchParams} from "next/navigation";
import {type SetStateAction, useEffect, useState} from "react";
import type {derivationPackageOverview} from "@/types/api";
import Logger from "@iglu-sh/logger";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import RemoveFromCache from "@/components/custom/apiKeys/removeFromCache";
import AddApiKey from "@/components/custom/apiKeys/addApiKey";

export default function Performance(){
    const params = useSearchParams()
    const cacheID = params.get("cacheID")
    if(!cacheID) {
        console.log("No cache ID provided")
        return <LoaderCircle className="animate-spin" />
    }
    const api_cache = api.cache.getOverview.useQuery({cacheID: parseInt(cacheID)})
    const api_cacheKeys = api.cache.getKeys.useQuery({cacheID: parseInt(cacheID)})
    const [cache, setCache]= useState(api_cache.data)
    const [cacheKeys, setCacheKeys] = useState(api_cacheKeys.data)
    const [settingChanged, setSettingChanged] = useState(false)
    useEffect(() => {
        if(settingChanged) return
        if(api_cache.data){
            setCache(api_cache.data)
            setSettingChanged(true)
        }
        if(api_cacheKeys.data){
            setCacheKeys(api_cacheKeys.data)
            setSettingChanged(true)
        }
    }, [api_cache, api_cacheKeys]);

    if(api_cache.isLoading || api_cacheKeys.isLoading || !cache || !cacheKeys){
        return <LoaderCircle className="animate-spin" />
    }
    const APIKeyColumns:ColumnDef<{
        apikey:Omit<keys, 'hash'>,
        public_signing_keys:public_signing_keys[],
        user: {
            id: string,
            username: string,
            updated_at: Date,
            avatar_color: string,
            email: string,
            is_admin: boolean
        }
    }>[] = [
        {
            accessorKey: "apikey.name",
            header: "Name",
        },
        {
            accessorKey: "apikey.description",
            header: "Description",
            cell: (info)=> (info.getValue() as string || "No description provided")
        },
        {
            accessorKey: "user.username",
            header: "Owner",
            cell: ({row}) => {
                return (
                    <div>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Avatar>
                                    <AvatarFallback style={{backgroundColor:row.original.user.avatar_color ?? "#111827"}}>
                                        {row.original.user.username?.charAt(0).toUpperCase() ?? <Bot />}
                                    </AvatarFallback>
                                </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>
                                <div className="flex flex-col">
                                    <div className="font-bold text-sm">
                                        {row.original.user.username || "Iglu Builder"}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {row.original.user.email || "In use by an Iglu Builder configuration"}
                                    </div>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                )
            }
        },
        {
            accessorKey: "public_signing_keys",
            header: "Signing Keys associated",
            cell: ({row}) => {
                const keys = row.original.public_signing_keys
                return (
                    <div className="flex flex-col">
                        {keys.length}
                    </div>
                )
            }
        },
        {
            accessorKey: "apikey.id",
            header: "Actions",
            cell: ({row}) => {
                return (
                    <div className="flex flex-row gap-2">
                        <Button variant="secondary" disabled={!row.original.user.username}>
                            Edit PSKs
                        </Button>
                        <RemoveFromCache
                            apiKeyId={row.original.apikey.id.toString()}
                            cacheId={cacheID}
                            disabled={!row.original.user.username}
                        />
                    </div>
                )
            }
        }
    ]
    return(
    <div className="flex flex-col gap-4 mb-5 max-w-full">
        <div className="flex flex-col">
            <h1 className="text-3xl font-bold">
            Settings
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
            Manage your cache here. If you want to create new one (for example if you want to have one cache for you and one cache for friends and family), you can create a new one <Link href="/app/caches/create" className="text-primary">here</Link>
            </p>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>
                    General Settings
                </CardTitle>
                <CardDescription>
                    Configure general settings here
                </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                    <Label htmlFor="name">
                        Name
                    </Label>
                    <Input type="text" id="name"
                           minLength={3}
                           value={cache.info.name}
                           onChange={(e)=>{
                               console.log("Changing name to ", e.target.value)
                               setCache({
                                      ...cache,
                                      info: {
                                        ...cache.info,
                                        name: e.target.value
                                      }
                               })
                           }}
                    ></Input>
                </div>
                <div className="flex flex-col gap-2">
                    <Label htmlFor="name">
                        Endpoint
                    </Label>
                    <div className="p-2 font-mono bg-muted rounded text-sm flex text-center items-center">
                        http://localhost:3000/{cache.info.name}
                    </div>
                </div>
                <div className="flex flex-row col-span-2">
                    <Alert variant="destructive">
                        <AlertCircleIcon />
                        <AlertTitle>
                            About changing the name
                        </AlertTitle>
                        <AlertDescription>
                            If you change this name, the endpoint will also change, meaning you will need to update any clients using this cache to use the new endpoint.
                        </AlertDescription>
                    </Alert>
                </div>
                <div className="flex flex-col gap-2">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Label htmlFor="name">
                                Preferred Compression Method
                            </Label>
                        </TooltipTrigger>
                        <TooltipContent>
                            <div>
                                <div className="text-sm">
                                    About preferred compression methods:
                                </div>
                                <div>
                                    This is the compression method that the cache will tell the clients to use, however regardless of what is set here, a client can always elect to use a different compression method if it seems fit. <br />
                                    A mismatched compression method will still be accepted by the cache.
                                </div>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                    <Select defaultValue={cache.info.preferredcompressionmethod}
                        onValueChange={(e)=>{
                            setCache({
                                ...cache,
                                info: {
                                    ...cache.info,
                                    preferredcompressionmethod: e
                                }
                            })
                        }}
                    >
                        <SelectTrigger>
                            {cache.info.preferredcompressionmethod.toUpperCase()}
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="xz" aria-selected={cache.info.preferredcompressionmethod == "xz"}>XZ</SelectItem>
                            <SelectItem value="zsdt" aria-selected={cache.info.preferredcompressionmethod == "zsdt"}>ZSDT</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex flex-col gap-2">
                    <Label htmlFor="priority">
                        Priority
                    </Label>
                    <Input type="number" id="priority"
                        value={cache.info.priority}
                        onChange={(e)=>{
                            setCache({
                                ...cache,
                                info: {
                                    ...cache.info,
                                    priority: parseInt(e.target.value)
                                }
                            })
                        }}
                    ></Input>
                </div>
                <div className="flex flex-col gap-2">
                    <Label htmlFor="public_status">
                        Public?
                    </Label>
                    <Select disabled>
                        <SelectTrigger id="public_status">
                            Yes
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="no">No</SelectItem>
                            <SelectItem value="yes">Yes</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex flex-col gap-2">
                    <Label htmlFor="github_username">
                        Github Username
                    </Label>
                    <Input type="text" id="github_username"
                        value={cache.info.githubusername}
                           onChange={(e)=>{
                                 setCache({
                                          ...cache,
                                          info: {
                                         ...cache.info,
                                         githubusername: e.target.value
                                          }
                                 })
                           }}
                    ></Input>
                </div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>
                    Authentication
                </CardTitle>
                <CardDescription>
                    Configure which Public Keys are allowed to upload packages to this cache. Every single PSK needs to be added in your config as a trusted signing key. The keys that you cannot delete is the ones that are used by the Iglu Builder service.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                    <div className="flex flex-row justify-between items-center">
                        <h2 className="text-sm font-semibold">
                            API Keys Allowed to Upload
                        </h2>
                        <AddApiKey cacheId={cacheID} alreadyAssignedKeys={
                            cacheKeys.map(ck => ck.apikey.id)
                        }
                        alreadyAssignedPSKs={
                            cacheKeys.flatMap(ck => ck.public_signing_keys.map(psk => psk.id))
                        }
                        />
                    </div>
                    <DataTable columns={APIKeyColumns} data={cacheKeys} pageIndex={0} pageSize={25} noPagination={false} />
                </div>
            </CardContent>
        </Card>
        <Button>
            Save Settings
        </Button>
    </div>
)
}
