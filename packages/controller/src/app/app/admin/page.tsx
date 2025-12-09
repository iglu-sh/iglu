'use client'
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import CachesTab from "@/app/app/admin/Components/cachesTab";
import {api} from "@/trpc/react";
import {LoaderCircle} from "lucide-react";
import UsersTab from "@/app/app/admin/Components/usersTab";
import Builders from "@/app/app/builders/page";
import BuildersTab from "@/app/app/admin/Components/buildersTab";
import Link from "next/link";
import ConfigTab from "@/app/app/admin/Components/configTab";

export default function AdminPage(){
    const everything = api.admin.getCachesPropagated.useQuery()
    const users = api.admin.getAllUsers.useQuery()
    const builders = api.admin.getBuildersForCaches.useQuery()
    const config = api.admin.getControllerConfig.useQuery()
    return(
        <div className="flex flex-col gap-4 w-full">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold">Admin Page</h1>
                <span>Change specific settings of your cache</span>
            </div>
            <div className="grid grid-cols-2 gap-4">

            </div>
            <Tabs defaultValue="caches" className="w-full">
                <TabsList className="w-full">
                    <TabsTrigger value="caches">Caches</TabsTrigger>
                    <TabsTrigger value="users">Users</TabsTrigger>
                    <TabsTrigger value="builders">Builders</TabsTrigger>
                    <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
                    <TabsTrigger value="config">Controller Config</TabsTrigger>
                </TabsList>
                <TabsContent value="caches">{everything.data ? <CachesTab everything={everything.data} /> : <LoaderCircle className="animate-spin" />}</TabsContent>
                <TabsContent value="users">{users.data ? <UsersTab users={users.data} refreshUsers={()=>users.refetch()} /> : <LoaderCircle className="animate-spin" />}</TabsContent>
                <TabsContent value="builders">{builders.data ? <BuildersTab builders={builders.data} /> : <LoaderCircle className="animate-spin" />}</TabsContent>
                <TabsContent value="monitoring">Planned for the 1.0 Release! In the meantime: Check out our <Link href={"https://docs.iglu.sh/docs/Components/Iglu%20Cache#metrics"} className="text-primary">Prometheus Integration</Link></TabsContent>
                <TabsContent value="config">{config.data ? <ConfigTab config={config.data} /> : <LoaderCircle className="animate-spin" /> }</TabsContent>
            </Tabs>
        </div>
    )
}