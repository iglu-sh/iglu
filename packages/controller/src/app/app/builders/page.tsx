'use client'
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Button} from "@/components/ui/button";
import Link from "next/link";
import {useRouter, useSearchParams} from "next/navigation";
import {BuilderOverview} from "@/app/app/builders/components/builder";
import Queue from "@/app/app/builders/components/queue";
import {useSession} from "next-auth/react";
import Nodes from "@/app/app/builders/components/nodes";
import {auth} from "@/server/auth";
import {api} from "@/trpc/react";

export default function Builders(){
    // Get the current cacheID from the query params
    const searchParams = useSearchParams()
    const session = useSession()
    if(process.env.NEXT_PUBLIC_DISABLE_BUILDER === "true"){
        // If the builder is disabled, redirect to the home page
        document.location.href = "/";
    }
    const cacheID = searchParams.get("cacheID");

    const nodes = api.builder.getRegisteredNodes.useQuery()
    const router = useRouter()
    const createHandler = () => {
      router.push(`/app/builders/create?cacheID=${cacheID ?? '-1'}`)
    }

    return(
        <div className="flex flex-col w-full gap-4">
            <div className="flex flex-row items-center justify-between">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold">
                        Builders
                    </h1>
                    <div className="text-muted-foreground text-sm">
                        Build and manage Nix packages with ease
                    </div>
                </div>
                <div className="flex items-center">
                    <Button onClick={createHandler}>Create new Builder</Button>
                </div>
            </div>
            {
                cacheID ?
                    <div className="flex flex-col gap-2">
                        <Tabs defaultValue="builder" className="w-full">
                            <TabsList className="w-full">
                                <TabsTrigger value="builder">Builder</TabsTrigger>
                                <TabsTrigger value="queue">Queue</TabsTrigger>
                                {
                                  session.data && session.data.user && session.data.user.session_user.is_admin ?
                                    <TabsTrigger value="nodes">Nodes</TabsTrigger> : null
                                }
                            </TabsList>
                            <TabsContent value="builder"><BuilderOverview cacheID={parseInt(cacheID)} /></TabsContent>
                            <TabsContent value="queue"><Queue cacheID={parseInt(cacheID)} /></TabsContent>
                            {
                                session.data && session.data.user && session.data.user.session_user.is_admin ?
                                    <TabsContent value="nodes"><Nodes /></TabsContent> : null
                            }
                        </Tabs>
                    </div>
                    : <div className="flex flex-col gap-2">Loading</div>
            }
        </div>
    )
}
