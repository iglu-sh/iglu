import type {combinedBuilder} from "@iglu-sh/types/core/db";
import React, {type ChangeEvent, type Dispatch} from "react";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Switch} from "@/components/ui/switch";
import {isValidCron} from "cron-validator";
import {Separator} from "@/components/ui/separator";

export default function GeneralTab({config, setConfig}:{config:combinedBuilder, setConfig: Dispatch<React.SetStateAction<combinedBuilder>>}){
    return (
        <Card>
            <CardContent>
                <CardTitle>
                    General Settings
                </CardTitle>
                <CardDescription>
                    Configure the general settings for your builder. This includes the name, description, and other basic options.
                </CardDescription>
                <div className="flex flex-col gap-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <div className="font-bold" >
                                Name
                            </div>
                            <Input aria-invalid={!config.builder.name || config.builder.name.length < 1}
                                onChange={(e:ChangeEvent<HTMLInputElement>) => {
                                    setConfig({
                                        ...config,
                                        builder: {
                                            ...config.builder,
                                            name: e.target.value
                                        }
                                    })
                                }}
                                   value={config.builder.name}
                            ></Input>
                        </div>
                        <div />
                        <div className="flex flex-col col-span-2">
                            <div className="font-bold">
                                Description
                            </div>
                            <Textarea onChange={(e)=>{
                                setConfig({
                                    ...config,
                                    builder: {
                                        ...config.builder,
                                        description: e.target.value
                                    }
                                })
                            }}
                              value={config.builder.description}
                            />
                        </div>
                        <div className="grid grid-cols-6 col-span-2 gap-2">
                            <div className="flex flex-col col-span-2">
                                <div className="font-bold">
                                    Preferred Architecture
                                </div>
                                <Select onValueChange={(val)=>{setConfig({
                                    ...config,
                                    builder: {
                                        ...config.builder,
                                        arch: val
                                    }
                                })}}
                                    value={config.builder.arch}
                                >
                                    <SelectTrigger>
                                        {config.builder.arch == '' ? 'Select architecture' : config.builder.arch}
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="x86_64-linux">x86_64-linux</SelectItem>
                                        <SelectItem value="aarch64-linux">aarch64-linux</SelectItem>
                                        <SelectItem value="armv7l">armv7l</SelectItem>
                                        <SelectItem value="i686">i686</SelectItem>
                                        <SelectItem value="riscv64">riscv64</SelectItem>
                                    </SelectContent>
                                </Select>
                                <div className="text-xs text-muted-foreground mt-2">
                                    Careful: Builds will only run on a node with the selected architecture.
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <div className="font-bold mb-2">
                                    Enabled
                                </div>
                                <Switch checked={config.builder.enabled} onCheckedChange={(val)=>{
                                    setConfig({
                                        ...config,
                                        builder: {
                                            ...config.builder,
                                            enabled: val
                                        }
                                    })
                                }}
                                />
                            </div>
                            <div className="grid grid-cols-2 col-span-3 gap-2 justify-between">
                                <div className="flex flex-col w-full">
                                    <div className="font-bold">
                                        Trigger
                                    </div>
                                    <Select onValueChange={(val)=>{
                                        setConfig({
                                            ...config,
                                            builder: {
                                                ...config.builder,
                                                trigger: val
                                            }
                                        })
                                    }}
                                        value={config.builder.trigger}
                                    >
                                        <SelectTrigger className="w-full">
                                            {
                                                config.builder.trigger == '' ? 'Select trigger' : config.builder.trigger
                                            }
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="manual">Manual</SelectItem>
                                            <SelectItem value="cron">Cron</SelectItem>
                                            <SelectItem value="webhook">Webhook</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {
                                    config.builder.trigger === 'cron' ? (
                                        <div className="flex flex-col">
                                                <span className="font-bold">
                                                    Cron Expression
                                                </span>
                                            <Input value={config.builder.cron} onChange={(e)=>{
                                                setConfig({
                                                    ...config,
                                                    builder: {
                                                        ...config.builder,
                                                        cron: e.target.value
                                                    }
                                                })
                                            }}
                                            aria-invalid={config.builder.cron === '' || !isValidCron(config.builder.cron) }
                                            />
                                        </div>
                                    ) : null
                                }
                            </div>
                        </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 col-span-2 gap-x-2 gap-y-4">
                        <div className="flex flex-col gap-1">
                            <div className="font-bold">
                                Git Repo
                            </div>
                            <Input onChange={(e:ChangeEvent<HTMLInputElement>) => {
                                setConfig({
                                    ...config,
                                    git_config: {
                                        ...config.git_config,
                                        repository: e.target.value
                                    }
                                })
                            }}
                            value={config.git_config.repository}
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <div className="font-bold">
                                Git Branch
                            </div>
                            <Input onChange={(e:ChangeEvent<HTMLInputElement>) => {
                                setConfig({
                                    ...config,
                                    git_config: {
                                        ...config.git_config,
                                        branch: e.target.value
                                    }
                                })
                            }}
                            value={config.git_config.branch}
                            />
                        </div>
                        <div className="flex flex-row justify-between">
                            <div className="font-bold">
                                Enable Git Authentication
                            </div>
                            <Switch checked={config.git_config.requiresauth} onCheckedChange={(e)=>{
                                setConfig({
                                    ...config,
                                    git_config: {
                                        ...config.git_config,
                                        requiresauth: e
                                    }
                                })
                            }}
                            />
                        </div>
                        <div />
                        {
                            config.git_config.requiresauth ? (
                                <div className="grid grid-cols-2 col-span-2 gap-2">
                                    <div className="flex flex-col gap-1">
                                        <div className="font-bold">
                                            Username
                                        </div>
                                        <Input
                                            onChange={(e:ChangeEvent<HTMLInputElement>) => {
                                                   setConfig({
                                                        ...config,
                                                        git_config: {
                                                            ...config.git_config,
                                                            gitusername: e.target.value
                                                        }
                                                    })
                                            }} aria-invalid={config.git_config.gitusername === ''}
                                            value={config.git_config.gitusername}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <div className="font-bold">
                                            Git Key
                                        </div>
                                        <Input
                                            onChange={(e:ChangeEvent<HTMLInputElement>) => {
                                                setConfig({
                                                    ...config,
                                                    git_config: {
                                                        ...config.git_config,
                                                        gitkey: e.target.value
                                                    }
                                                })
                                            }} aria-invalid={config.git_config.gitkey === ''}
                                            value={config.git_config.gitkey}
                                        />
                                    </div>
                                </div>
                            ) : null
                        }
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}