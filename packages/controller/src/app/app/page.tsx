'use client'
import {auth} from "@/server/auth";
import {useRouter, redirect, useParams, useSearchParams} from "next/navigation";
import {useState} from "react";
import {useEffect} from "react";
import {api} from "@/trpc/react";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {
    Clock,
    Database,
    Download, Hammer,
    HardDrive, Network,
    Package,
    RefreshCcw,
    SettingsIcon,
    Users,
    Zap
} from "lucide-react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import Activity from "@/components/custom/overview/activity";
import type {log} from "@/types/db";

export default function App(){
    const params = useSearchParams()
    const cacheID = params.get("cacheID");
    const [size, setSize] = useState<number>(0)

    const router = useRouter()
    const handler = (path: string) => {
      router.push(path + "?" + params.toString())
    }

    // Fetch the selected cache
    const cache = api.cache.getOverview.useQuery({
        cacheID: parseInt(cacheID!) // This should be replaced with the actual cache ID you want to fetch
    }, {
        // Only fetch if cacheID is valid
        enabled: cacheID !== null && cacheID !== undefined,
    }).data
    const pkgs = api.pkgs.getPkgsForCache.useQuery({cacheId: parseInt(cacheID!)})
    useEffect(() => {
        if(!cache || !pkgs?.data?.rows) return;
        setSize(pkgs.data.rows.reduce((prev, cur) => {
            console.log(prev + parseInt(cur.size))
            return prev + parseFloat(cur.size) / 1024 / 1024 / 1024
        }, 0))
    }, [pkgs, cache]);

    return(
        <div className="w-full flex flex-col gap-4">
            <div className="flex flex-row justify-between items-center w-full">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-bold">
                        {cache ? `Cache Overview for ${cache.info.name}` : "Loading Cache Overview..."}
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {
                          cache && pkgs ? `${cache.info.uri}/${cache.info.name} • Total Packages: ${pkgs.data?.rows ? pkgs.data.rows.length : 0}, Storage Used: ${size.toFixed(2)}GiB` : "Loading cache details..."
                      }
                    </p>
                </div>
                <div className="flex flex-row gap-2">
                    <Badge className="border-green-500 bg-transparent rounded-full text-green-500">
                        Healthy
                    </Badge>
                    <Button onClick={()=>{window.location.reload()}}>
                        <RefreshCcw />
                        Refresh
                    </Button>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <Card className="flex flex-col gap-0">
                    <CardHeader className="flex flex-row justify-between items-center">
                        <div>
                            Total Packages
                        </div>
                        <Package size={18} />
                    </CardHeader>
                    <CardContent>
                        <strong className="text-2xl font-bold">
                            {cache ? cache.packages.total : "Loading..."}
                        </strong>
                    </CardContent>
                </Card>
                <Card className="flex flex-col gap-0">
                    <CardHeader className="flex flex-row justify-between items-center">
                        <div>
                            Storage Used
                        </div>
                        <HardDrive size={18} />
                    </CardHeader>
                    <CardContent>
                        <strong className="text-2xl font-bold">
                            {cache ? cache.packages.total : "Loading..."}
                        </strong>
                    </CardContent>
                </Card>
                <Card className="flex flex-col gap-0">
                    <CardHeader className="flex flex-row justify-between items-center">
                        <div>
                            Cache Hit Rate
                        </div>
                        <Download size={18} />
                    </CardHeader>
                    <CardContent>
                        <strong className="text-2xl font-bold">
                            {cache ? cache.packages.total : "Loading..."}
                        </strong>
                    </CardContent>
                </Card>
                <Card className="flex flex-col gap-0">
                    <CardHeader className="flex flex-row justify-between items-center">
                        <div>
                            Response Time
                        </div>
                        <Clock size={18} />
                    </CardHeader>
                    <CardContent>
                        <strong className="text-2xl font-bold">
                            {cache ? cache.packages.total : "Loading..."} ms
                        </strong>
                    </CardContent>
                </Card>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-bold flex flex-row items-center gap-2">
                        <Zap />
                        Quick Actions
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2">
                    <Button onClick={() => handler("/app/settings")} variant="outline" className="flex flex-row items-center gap-1 justify-start h-20">
                        <div className="flex flex-col gap-2">
                            <div className="flex flex-row gap-2 items-center">
                                <SettingsIcon size={18} />
                                Settings
                            </div>
                            <div className="text-muted-foreground text-sm">
                                Configure cache behavior, storage, and more.
                            </div>
                        </div>
                    </Button>
                    <Button onClick={() => handler("/app/admin")} variant="outline" className="flex flex-row items-center gap-1 justify-start h-20">
                        <div className="flex flex-col gap-2">
                            <div className="flex flex-row gap-2 items-center">
                                <Users size={18} />
                                User Management
                            </div>
                            <div className="text-muted-foreground text-sm">
                                Manage access & permissions.
                            </div>
                        </div>
                    </Button>
                    <Button onClick={() => handler("/app/storage")} variant="outline" className="flex flex-row items-center gap-1 justify-start h-20">
                        <div className="flex flex-col gap-2">
                            <div className="flex flex-row gap-2 items-center">
                                <Database />
                                Storage Management
                            </div>
                            <div className="text-muted-foreground text-sm">
                                Cleanup & optimization
                            </div>
                        </div>
                    </Button>
                    <Button onClick={() => handler("/app/builders")} variant="outline" className="flex flex-row items-center gap-1 justify-start h-20">
                        <div className="flex flex-col gap-2">
                            <div className="flex flex-row gap-2 items-center">
                                <Hammer />
                                Builders
                            </div>
                            <div className="text-muted-foreground text-sm">
                                Manage build processes and configurations.
                            </div>
                        </div>
                    </Button>
                </CardContent>
            </Card>
            <div className="grid grid-cols-2 gap-2">
                <Card>
                    <CardContent className="flex flex-col gap-4 overflow-x-auto">
                        <CardTitle>
                            Cache Information
                        </CardTitle>
                        <div className="flex flex-col gap-2">
                            <div className="flex flex-row gap-2 items-center">
                                <Network size={18}/><strong>Endpoint</strong> {cache ? `${cache.info.uri}/${cache.info.name}` : 'Loading...'}
                            </div>
                            <div className="flex flex-row gap-2 items-center">
                               <Database size={18} /><strong>Compression</strong> {cache ? cache.info.preferredcompressionmethod : 'Loading...'}
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex flex-col gap-4">
                        <CardTitle>
                            Recent Activity
                        </CardTitle>
                        <div className="flex flex-col gap-2 h-50 max-h-50 overflow-y-auto">
                            {
                                cache?
                                        cache.audit_log.map((log: log, index:number)=>{

                                            return(
                                                <Activity log={log} key={index} />
                                            )
                                        })
                                     :
                                    null
                            }
                        </div>
                        <Button variant="outline" className="w-full mt-2" onClick={() => redirect("/activity")}>
                            View All Activity
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
