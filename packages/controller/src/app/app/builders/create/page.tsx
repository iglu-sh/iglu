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
import {useSearchParams} from "next/navigation";
export default function CreatePage(){
    const [loading, setLoading] = useState<boolean>(false);
    const params = useSearchParams()
    const [config, setConfig] = useState<combinedBuilder>({
        builder: {
            id: -1,
            cache_id: params.get('cacheID') ? parseInt(params.get('cacheID')!) : -1,
            name: '',
            description: '',
            enabled: true,
            trigger: '',
            cron: '',
            webhookurl: 'https://example.com/webhook',
            arch: '',
        },
        cachix_config: {
            id: -1,
            builder_id: -1,
            push: true,
            apikeyid: -1,
            signingkeyid: -1,
            target: params.get('cacheID') ? parseInt(params.get('cacheID')!) : -1, // Target cache?
            apikey: '',
            signingkey: '',
            buildoutpudir: './result'
        },
        git_config: {
            id: -1,
            builder_id: -1,
            repository: '',
            branch: 'main',
            gitusername: '',
            gitkey: '',
            requiresauth: false,
            noclone: false
        },
        build_options: {
            id: -1,
            builder_id: -1,
            cores: 4,
            maxjobs: 4,
            keep_going: false,
            extraargs: '',
            command: '',
            substituters: [
                {
                    url: 'https://cache.nixos.org',
                    public_signing_keys: ['cache.nixos.org-1:6NCHdD59X431o0gWypbMrAURkbJ16ZPMQFGspcDShjY=']
                }
            ]
        }
    })
    const createBuilder = api.builder.createBuilder.useMutation({
        onSuccess: (result)=>{
            setLoading(false);
            toast.success(`Builder ${result.builder.name} created successfully!`);
            // Redirect to the builder page
            window.location.href = `/app/builders/details/${result.builder.id}`;
        },
        onError: (error)=>{
            setLoading(false);
            toast.error(`Failed to create builder: ${error.message}`);
        }
    })
    useEffect(()=>{
        console.log(config)
    }, [config])
    useEffect(() => {
        console.log(params.get('cacheID'));
    }, [params]);
    function handleSubmit(){
        setLoading(true)
        const result = builderSchema.safeParse(config);
        if(!result.success){
            setLoading(false);
            for(const error of result.error.errors){
                console.log(error)
                const keyPath = error.path.join('->');
                toast.error(`Invalid value for ${keyPath}: ${error.message}`);
            }
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        createBuilder.mutate(config as never)
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
                    </div> : 'Create Builder'
                }
            </Button>
            <Toaster richColors={true} />
        </div>
    )
}