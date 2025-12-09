'use client'
import type {xTheEverythingType} from "@/types/db";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Globe, LockIcon} from "lucide-react";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import Overview from "@/components/custom/oob/claimable/overview";
import Configuration from "@/components/custom/oob/claimable/configuration";
import ApiKeys from "@/components/custom/oob/claimable/apiKeys";
import PublicKeys from "@/components/custom/oob/claimable/publicKeys";

export default function ClaimableCache({cache, claimed, claim}:{cache:xTheEverythingType, claimed: boolean, claim:(id:number)=> void}) {
    return(
        <Card className="overflow-auto">
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <div className="flex flex-row gap-2">
                        <h2 className="text-2xl font-bold">
                            {cache.cache.name}
                        </h2>
                        {
                            claimed ? (
                                <Badge className="bg-green-500">Claimed</Badge>
                            ) : (
                                <Badge variant="secondary">Unclaimed</Badge>
                            )
                        }
                    </div>
                    <div className="flex flex-row gap-1">
                        <Button onClick={()=>claim(cache.cache.id)} variant={claimed ? "destructive" : "default"}>
                            <LockIcon />
                            {
                                claimed ? "Unclaim Cache" : "Claim Cache"
                            }
                        </Button>
                    </div>
                </CardTitle>
                <CardDescription>
                    <div className="flex flex-row items-center gap-1">
                        <Globe />
                        {process.env.NEXT_PUBLIC_CACHE_URL}/{cache.cache.name}
                    </div>
                </CardDescription>
                <CardContent className="mt-2">
                    <Tabs defaultValue="overview" className="w-full">
                        <TabsList className="w-full">
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="configuration">Configuration</TabsTrigger>
                            <TabsTrigger value="apikeys">API Keys</TabsTrigger>
                            <TabsTrigger value="publickeys">Public Keys</TabsTrigger>
                        </TabsList>
                        <TabsContent value="overview"><Overview cache={cache} /></TabsContent>
                        <TabsContent value="configuration"><Configuration cache={cache} /></TabsContent>
                        <TabsContent value="apikeys"><ApiKeys cache={cache} /></TabsContent>
                        <TabsContent value="publickeys"><PublicKeys cache={cache} /></TabsContent>
                    </Tabs>
                </CardContent>
            </CardHeader>
        </Card>
    )
}