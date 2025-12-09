'use client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import GeneralTab from "@/components/custom/builder/create/generalTab";
import {useEffect, useState} from "react";
import type {combinedBuilder, uuid} from "@iglu-sh/types/core/db";
import BuildOptionsTab from "@/components/custom/builder/create/buildOptionsTab";
import Link from "next/link";
import {builderSchema} from '@/types/schemas'
import {Button} from "@/components/ui/button";
import {Toaster} from "@/components/ui/sonner";
import { toast } from "sonner";
import {LoaderCircle} from "lucide-react";
import {api} from "@/trpc/react";
import {useParams, useRouter, useSearchParams} from "next/navigation";
export default function CreatePage(){
    const [loading, setLoading] = useState<boolean>(false);
    const {builderID} = useParams()
    const router = useRouter()
    const apiConfig = api.builder.getBuilderById.useQuery({id:parseInt((builderID ?? 0).toString())})

    const [config, setConfig] = useState<combinedBuilder>(apiConfig.data!);

    const updateBuilder = api.builder.updateBuilder.useMutation({
        onSuccess: (result)=>{
            setLoading(false);
            toast.success(`Builder ${result.builder.name} edited successfully!`);
            // Redirect to the builder page
            window.location.href = `/app/builders/details/${result.builder.id}`;
        },
        onError: (error)=>{
            setLoading(false);
            toast.error(`Failed to update builder: ${error.message}`);
        }
    })
    useEffect(()=>{
        console.log(config)
    }, [config])
    function handleSubmit(){
        setLoading(true)
        console.log(config)
        const result = builderSchema.safeParse(config);
        if(!result.success){
            setLoading(false);
            for(const error of result.error.errors){
                const keyPath = error.path.join('->');
                toast.error(`Invalid value for ${keyPath}: ${error.message}`);
            }
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        updateBuilder.mutate(config as never)
    }
    if(!config){
        return <div>Loading...</div>
    }
    return(
        <div className="flex flex-col gap-4 w-full">
            <div>
                <h1 className="text-3xl font-bold">
                    Create a new Builder
                </h1>
                <div className="text-sm text-muted-foreground">
                    Use this page to create a new Builder instance. You can configure the builder settings and select the cache to use.
                </div>
            </div>
            <Tabs defaultValue="general" className="w-full">
                <TabsList className="w-full">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="buildOptions">Build Options</TabsTrigger>
                </TabsList>
                <TabsContent value="general"><GeneralTab config={config} setConfig={setConfig} /></TabsContent>
                <TabsContent value="buildOptions"><BuildOptionsTab config={config} setConfig={setConfig} /></TabsContent>
            </Tabs>
            <Button onClick={handleSubmit} disabled={loading}>
                {
                    loading ? <div className="animate-spin">
                        <LoaderCircle />
                    </div> : 'Update Builder'
                }
            </Button>
            <Toaster richColors={true} />
        </div>
    )
}
