'use client'
import {api} from "@/trpc/react";
import {useParams} from "next/navigation";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {CircleAlert, CircleCheck, Clock, Copy, CopyIcon, Table} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {Badge} from "@/components/ui/badge";
import {toast} from "sonner";
import JsonView from "@/app/app/builders/details/[builderID]/components/JsonView";
import {DataTable} from "@/components/custom/DataTable";
import {columns} from "@/app/app/builders/details/[builderID]/components/columns";
import Link from "next/link";
import DeleteBuilder from "@/app/app/builders/details/[builderID]/components/deleteBuilder";

export default function BuilderDetailsPage(){
    const params = useParams()
    const builderID = params.builderID
    if(!builderID || isNaN(parseInt(builderID.toString()))){
        return <div>Invalid Builder ID</div>
    }
    const builder = api.builder.getBuilderById.useQuery({id: parseInt(builderID.toString())})
    const runs = api.builder.getRunsForBuilder.useQuery({id: parseInt(builderID.toString())})
    if(builder.isLoading || !builder.data || runs.isLoading || !runs.data){
        return <div>Loading...</div>
    }
    async function triggerBuild(){
        // Calls the webhook endpoint to trigger a build
        toast.info("Triggering build, if this fails, make sure that you have at least one node connected to your controller...")
        await fetch(builder.data!.builder.webhookurl, {
            method: 'GET'
        })
            .then((res)=>{
                if(res.ok){
                    toast.success("Build triggered successfully!")
                }
                else{
                    toast.error("Failed to trigger build, please make sure that you have at least one node connected to your controller.")
                }
            })
            .catch(()=>{
                toast.error("Failed to trigger build, please make sure that you have at least one node connected to your controller.")
            })
    }
    return(
        <div className="flex flex-col gap-4 w-full">
            <div className="flex flex-row justify-between items-center w-full">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold">Builder Details Page</h1>
                    <p>Overview for Builder {builder.data.builder.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <Link href={`/app/builders/edit/${builderID}?cacheID=${builder.data.builder.cache_id}`} className="w-full">
                        <Button className="w-full">Edit Builder</Button>
                    </Link>
                    <DeleteBuilder builderID={parseInt(builderID as string)} />
                    <Button variant="secondary" onClick={triggerBuild}>Trigger Build</Button>
                    <JsonView data={builder.data} />
                </div>
            </div>
            <div className="grid grid-cols-4 w-full gap-4">
                <Card className="w-full">
                    <CardHeader className="flex justify-between items-center flex-row w-full">
                        <h2>Runs</h2>
                        <Table />
                    </CardHeader>
                    <CardContent>
                        <div className="font-bold text-xl">
                            {runs.data.totalRuns}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Runs</div>
                    </CardContent>
                </Card>
                <Card className="w-full">
                    <CardHeader className="flex justify-between items-center flex-row w-full">
                        <h2>Last Run</h2>
                        <Clock />
                    </CardHeader>
                    <CardContent>
                        <div className="font-bold text-xl">
                            {runs.data.runDetails[0]?.builder_run.run.duration ?? "N/A"}
                        </div>
                        <div className="text-sm text-muted-foreground">Last run Duration</div>
                    </CardContent>
                </Card>
                <Card className="w-full">
                    <CardHeader className="flex justify-between items-center flex-row w-full">
                        <h2>Success</h2>
                        <CircleCheck />
                    </CardHeader>
                    <CardContent>
                        <div className="font-bold text-xl">
                            {runs.data.runStates.success}
                        </div>
                        <div className="text-sm text-muted-foreground">Successfully build jobs</div>
                    </CardContent>
                </Card>
                <Card className="w-full">
                    <CardHeader className="flex justify-between items-center flex-row w-full">
                        <h2>Unsuccessfull</h2>
                        <CircleAlert />
                    </CardHeader>
                    <CardContent>
                        <div className="font-bold text-xl">
                            {runs.data.runStates.failed + runs.data.runStates.canceled}
                        </div>
                        <div className="text-sm text-muted-foreground">Runs with errors</div>
                    </CardContent>
                </Card>
            </div>
            <div className="w-full grid grid-cols-2 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold">
                            General Configuration
                        </CardTitle>
                        <CardDescription>
                            Overview of the general builder configuration
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                        <div className="flex flex-row gap-2 justify-between items-center">
                            <Label>Builder Name</Label>
                            <Badge className="font-bold" variant="secondary">{builder.data.builder.name}</Badge>
                        </div>
                        <div className="flex flex-row gap-2 justify-between items-center">
                            <Label>Arch</Label>
                            <Badge className="font-bold" variant="secondary">{builder.data.builder.arch}</Badge>
                        </div>
                        <div className="flex flex-row gap-2 justify-between items-center">
                            <Label>Trigger Type</Label>
                            <Badge className="font-bold" variant="secondary">{builder.data.builder.trigger}</Badge>
                        </div>
                        <div className="flex flex-row gap-2 justify-between items-center">
                            <Label>Webhook URL</Label>
                            {/*Show the webhook url but only the first 20 chars*/}
                            <Button variant="ghost" onClick={async (e)=>{
                                try {
                                    if(!navigator.clipboard || !builder.data?.builder.webhookurl) {
                                        toast.error("Could not copy to clipboard, try to copy from the JSON view");
                                        return
                                    }
                                    toast.success("Copied to clipboard");
                                    await navigator.clipboard.writeText(builder.data.builder.webhookurl);
                                } catch (err) {
                                    toast.error("Could not copy to clipboard, try to copy from the JSON view");
                                }
                            }} className="p-0">
                                <Badge className="font-bold" variant="secondary">{builder.data.builder.webhookurl.slice(0, 30)}...</Badge>
                            </Button>
                        </div>
                        <div className="flex flex-row gap-2 justify-between items-center">
                            <Label>Cache ID (i.e Cachix Target)</Label>
                            <Badge variant="secondary">{builder.data.builder.cache_id}</Badge>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold">
                            Build Options
                        </CardTitle>
                        <CardDescription>
                            Overview of the build options configured for this builder
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                        <div className="flex flex-row gap-2 justify-between items-center">
                            <Label>Cores</Label>
                            <Badge variant="secondary">{builder.data.build_options.cores}</Badge>
                        </div>
                        <div className="flex flex-row gap-2 justify-between items-center">
                            <Label>Max Jobs</Label>
                            <Badge variant="secondary">{builder.data.build_options.maxjobs}</Badge>
                        </div>
                        <div className="flex flex-row gap-2 justify-between items-center">
                            <Label>Keep Going?</Label>
                            <Badge variant="secondary">{builder.data.build_options.keep_going ? "True": "False"}</Badge>
                        </div>
                        <div className="flex flex-row gap-2 justify-between items-center">
                            <Label>Configured Substituters</Label>
                            <Badge variant="secondary">{builder.data.build_options.substituters.length}</Badge>
                        </div>
                        <div className="flex flex-row gap-2 justify-between items-center">
                            <Label>Build Command</Label>
                            <Badge variant="secondary">{builder.data.build_options.command}</Badge>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold">
                            Git Configuration
                        </CardTitle>
                        <CardDescription>
                            Overview of the git configuration for this builder
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                        <div className="flex flex-row gap-2 justify-between items-center">
                            <Label>Repo</Label>
                            <Badge variant="secondary">{builder.data.git_config.repository}</Badge>
                        </div>
                        <div className="flex flex-row gap-2 justify-between items-center">
                            <Label>Branch</Label>
                            <Badge variant="secondary">{builder.data.git_config.branch}</Badge>
                        </div>
                        <div className="flex flex-row gap-2 justify-between items-center">
                            <Label>Git Username</Label>
                            <Badge variant="secondary">{builder.data.git_config.gitusername.length === 0 ? "_none_" : builder.data.git_config.gitusername}</Badge>
                        </div>
                        <div className="flex flex-row gap-2 justify-between items-center">
                            <Label>Git Password</Label>
                            <Badge variant="secondary">REDACTED</Badge>
                        </div>
                        <div className="flex flex-row gap-2 justify-between items-center">
                            <Label>Repo Requires Auth?</Label>
                            <Badge variant="secondary">{builder.data.git_config.requiresauth ? "True" : "False"}</Badge>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold">
                            Cachix Config
                        </CardTitle>
                        <CardDescription>
                            Overview of the cachix configuration for this builder
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                        <div className="flex flex-row gap-2 justify-between items-center">
                            <Label>Push?</Label>
                            <Badge variant="secondary">{builder.data.cachix_config.push ? "True": "False"}</Badge>
                        </div>
                        <div className="flex flex-row gap-2 justify-between items-center">
                            <Label>API Key</Label>
                            <Badge variant="secondary">REDACTED</Badge>
                        </div>
                        <div className="flex flex-row gap-2 justify-between items-center">
                            <Label>Signing Key</Label>
                            <Badge variant="secondary">REDACTED</Badge>
                        </div>
                        <div className="flex flex-row gap-2 justify-between items-center">
                            <Label>Output Dir</Label>
                            <Badge variant="secondary">{builder.data.cachix_config.buildoutpudir ?? "./result"}</Badge>
                        </div>
                    </CardContent>
                </Card>
                <div className="flex gap-2 col-span-2 w-full">
                    <div className="w-full">
                        <DataTable columns={columns} data={runs.data.runDetails} />
                    </div>
                </div>
            </div>
        </div>
    )
}